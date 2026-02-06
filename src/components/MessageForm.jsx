import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Input,
  IconButton,
  Box,
  Container,
  Flex,
  Text,
  VStack,
  HStack,
  Tooltip,
  SimpleGrid,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
} from "@chakra-ui/react";

import { useOutsideClick, useDisclosure } from "@chakra-ui/hooks";
import { BiSend, BiPaperclip, BiSmile } from "react-icons/bi";
import { toaster } from "@/components/ui/toaster";
import { useAppContext } from "../context/appContext";
import supabase from "../supabaseClient";
import { emojiMap } from "./ui/emojiMap";

/**
 * MessageForm with:
 * - :autocomplete
 * - Emoji picker popover (grid)
 * - Optimistic UI + socket broadcast hooks
 *
 * NOTE: This component will use, if available from useAppContext():
 *  - sendMessage(payload)  -> preferred (handles optimistic + broadcast in context)
 *  - addLocalMessage(msg)  -> optional helper to append optimistic message locally
 *  - socket                -> socket instance to emit optimistic and update events
 *
 * Popover replaces Modal to avoid missing-export build issues.
 */

export default function MessageForm() {
  const {
    username,
    country,
    session,
    currentChannel,
    // optional helpers that your context may provide:
    sendMessage: ctxSendMessage,
    addLocalMessage,
    socket,
  } = useAppContext();

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // emoji autocomplete state
  const [emojiQuery, setEmojiQuery] = useState("");
  const [matchedEmojis, setMatchedEmojis] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // emoji picker popover
  const { isOpen: isPickerOpen, onOpen: openPicker, onClose: closePicker } = useDisclosure();

  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const emojiNames = useMemo(() => Object.keys(emojiMap || {}), []);

  // detect :query before caret (returns the query without leading colon, or empty string)
  const detectEmojiQuery = useCallback((text, cursorPos) => {
    const left = text.slice(0, cursorPos);
    const match = left.match(/:([a-zA-Z0-9_+\-]*)$/);
    return match ? match[1] : "";
  }, []);

  const updateEmojiMatches = useCallback(
    (text, caretPos) => {
      const q = detectEmojiQuery(text, caretPos);
      setEmojiQuery(q);

      if (q && q.length > 0) {
        const qLower = q.toLowerCase();
        const matches = emojiNames
          .filter((name) => name.toLowerCase().startsWith(qLower))
          .slice(0, 8); // show max 8
        setMatchedEmojis(matches);
        setSelectedIndex(0);
        setShowAutocomplete(matches.length > 0);
      } else {
        setMatchedEmojis([]);
        setShowAutocomplete(false);
        setSelectedIndex(0);
      }
    },
    [detectEmojiQuery, emojiNames]
  );

  // input change handler
  const handleChange = (e) => {
    const v = e.target.value;
    setMessage(v);
    const cursor = e.target.selectionStart ?? v.length;
    updateEmojiMatches(v, cursor);
  };

  // keep selection-aware updates (when user clicks or moves caret)
  const handleSelect = (e) => {
    const caret = e.target.selectionStart ?? 0;
    updateEmojiMatches(e.target.value, caret);
  };

  // Insert emoji either from picker (emojiChar provided) or by emoji name (emojiName)
  const insertEmoji = (emojiOrName) => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    const cursor = el.selectionStart ?? message.length;

    // Determine char: if passed a name that exists in map, use that; if passed char, use as-is.
    const emojiChar = emojiMap[emojiOrName] ?? emojiOrName;

    const left = message.slice(0, cursor);
    const right = message.slice(cursor);

    // Replace last `:query` or `:query:` with the emoji char, if present; otherwise insert at caret
    const hasColonToken = /:([a-zA-Z0-9_+\-]*):?$/.test(left);
    const newLeft = hasColonToken ? left.replace(/:([a-zA-Z0-9_+\-]*):?$/, emojiChar) : left + emojiChar;
    const newMessage = newLeft + right;

    setMessage(newMessage);
    setEmojiQuery("");
    setMatchedEmojis([]);
    setShowAutocomplete(false);

    // set caret after inserted emoji
    setTimeout(() => {
      const pos = newLeft.length;
      try {
        el.focus();
        el.setSelectionRange(pos, pos);
      } catch (err) {
        // ignore
      }
    }, 0);

    // If the picker popover is open, close it after selection to mimic Discord behavior
    closePicker();
  };

  // parse emoji tokens like :smile: or :smile into emojiMap char if exists
  const parseEmojis = (text) =>
    text.replace(/:([a-zA-Z0-9_+\-]+):?/g, (_match, name) => emojiMap[name] ?? `:${name}:`);

  // keyboard handling
  const handleKeyDown = (e) => {
    // Autocomplete navigation
    if (showAutocomplete && matchedEmojis.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((s) => (s + 1) % matchedEmojis.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((s) => (s - 1 + matchedEmojis.length) % matchedEmojis.length);
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowAutocomplete(false);
        setMatchedEmojis([]);
        setEmojiQuery("");
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertEmoji(matchedEmojis[selectedIndex]);
        return;
      }
    }

    // Enter sends, Shift+Enter newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Outside click closes the autocomplete
  useOutsideClick({
    ref: autocompleteRef,
    handler: () => {
      setShowAutocomplete(false);
      setMatchedEmojis([]);
      setEmojiQuery("");
    },
  });

  // ensure selectedIndex valid
  useEffect(() => {
    if (selectedIndex >= matchedEmojis.length) setSelectedIndex(0);
  }, [matchedEmojis, selectedIndex]);

  // send message - supports optimistic UI and socket hooks
  const handleSubmit = useCallback(
    async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (isSending) return;

      const trimmed = message.trim();
      if (!trimmed) return;

      setIsSending(true);

      // create optimistic (temp) message object
      const tempId = `temp-${Math.random().toString(36).slice(2, 9)}`;
      const optimisticMessage = {
        id: tempId,
        text: parseEmojis(trimmed),
        username,
        country,
        is_authenticated: !!session,
        channel_id: currentChannel?.id ?? 1,
        timestamp: new Date().toISOString(),
        pending: true,
      };

      try {
        // Preferred path: let context's sendMessage handle optimistic + broadcast
        if (typeof ctxSendMessage === "function") {
          await ctxSendMessage(trimmed, { optimistic: true });
          // ctxSendMessage is expected to clear composer / handle optimistic UI
          setMessage("");
          setMatchedEmojis([]);
          setEmojiQuery("");
          setShowAutocomplete(false);
          setSelectedIndex(0);
          return;
        }

        // If context provides a local append helper, use it for optimistic UI
        if (typeof addLocalMessage === "function") {
          try {
            addLocalMessage(optimisticMessage);
          } catch (err) {
            console.warn("addLocalMessage failed:", err);
          }
        } else if (socket && typeof socket.emit === "function") {
          // fallback: emit optimistic message to other connected clients who can choose to show it
          try {
            socket.emit("message:new", optimisticMessage);
          } catch (err) {
            console.warn("socket emit optimistic failed:", err);
          }
        }

        // persist to DB (Supabase)
        const payload = {
          text: parseEmojis(trimmed),
          username,
          country,
          is_authenticated: !!session,
          channel_id: currentChannel?.id ?? 1,
        };

        const { data, error } = await supabase.from("messages").insert([payload]).select().single();

        if (error) {
          // notify and leave optimistic message flagged as failed if possible
          toaster.create({
            title: "Error sending",
            description: error.message || "Failed to send message",
            status: "error",
            duration: 9000,
            isClosable: true,
            color: "white",
            background: "#ef4444",
          });
          return;
        }

        // If we have a socket, inform others (or server might broadcast itself)
        if (socket && typeof socket.emit === "function") {
          try {
            // emit an update that replaces the temp id with real message
            socket.emit("message:update", { tempId, message: data });
          } catch (err) {
            console.warn("socket emit update failed:", err);
          }
        }

        // success: clear composer
        setMessage("");
        setMatchedEmojis([]);
        setEmojiQuery("");
        setShowAutocomplete(false);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Error sending message:", err);
        toaster.create({
          title: "Error sending",
          description: err?.message || "Failed to send message",
          status: "error",
          duration: 9000,
          isClosable: true,
          color: "white",
          background: "#ef4444",
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      message,
      username,
      country,
      session,
      currentChannel,
      ctxSendMessage,
      addLocalMessage,
      socket,
      isSending,
    ]
  );

  // Open emoji picker: focus input and open popover
  const handleOpenPicker = () => {
    openPicker();
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  // Quick utility: all emoji entries
  const emojiEntries = useMemo(() => Object.entries(emojiMap || {}), []);

  return (
    <Box bg="#2f3136" py="10px" px="4">
      <Container maxW="640px">
        <form onSubmit={handleSubmit} autoComplete="off">
          <Flex bg="#40444b" borderRadius="20px" px="3" py="2" align="center" gap={3}>
            <HStack spacing={2}>
              <Tooltip label="Attach file">
                <IconButton
                  aria-label="Attach file"
                  icon={<BiPaperclip />}
                  size="sm"
                  variant="ghost"
                  color="gray.300"
                />
              </Tooltip>

              {/* Popover picker anchored to the emoji button */}
              <Popover isOpen={isPickerOpen} onOpen={openPicker} onClose={closePicker} placement="top-start" closeOnBlur>
                <PopoverTrigger>
                  <Tooltip label="Emoji picker">
                    <IconButton
                      aria-label="Emoji"
                      icon={<BiSmile />}
                      size="sm"
                      variant="ghost"
                      color="gray.300"
                      onClick={handleOpenPicker}
                    />
                  </Tooltip>
                </PopoverTrigger>

                <PopoverContent bg="#2f3136" color="white" width="340px" _focus={{ boxShadow: "none" }}>
                  <PopoverArrow bg="#2f3136" />
                  <IconButton />
                  <PopoverBody p={3}>
                    <SimpleGrid columns={8} spacing={2} maxH="260px" overflowY="auto">
                      {emojiEntries.map(([name, char]) => (
                        <Box
                          key={name}
                          role="button"
                          onClick={() => {
                            insertEmoji(char);
                            // close popover to mimic Discord flow
                            closePicker();
                            // focus back
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          cursor="pointer"
                          borderRadius="6px"
                          _hover={{ bg: "#3a3d41" }}
                          textAlign="center"
                          fontSize="20px"
                          p={2}
                        >
                          {char}
                        </Box>
                      ))}
                    </SimpleGrid>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </HStack>

            <Box flex="1" position="relative">
              <Input
                name="message"
                placeholder={`Message ${currentChannel ? `#${currentChannel.name}` : "#general"}`}
                value={message}
                onChange={handleChange}
                onSelect={handleSelect}
                onKeyDown={handleKeyDown}
                bg="transparent"
                border="none"
                color="white"
                _placeholder={{ color: "#b9bbbe" }}
                fontSize="14px"
                autoFocus
                ref={inputRef}
                aria-label="Message input"
              />

              {/* Autocomplete dropdown */}
              {showAutocomplete && matchedEmojis.length > 0 && (
                <Box
                  position="absolute"
                  bottom="100%"
                  left="0"
                  bg="#202225"
                  borderRadius="8px"
                  boxShadow="0 6px 18px rgba(0,0,0,0.6)"
                  mt="2"
                  zIndex={50}
                  ref={autocompleteRef}
                  maxH="220px"
                  overflowY="auto"
                  width="260px"
                  role="listbox"
                  aria-activedescendant={matchedEmojis[selectedIndex] ? `emo-${matchedEmojis[selectedIndex]}` : undefined}
                >
                  <VStack spacing="0" align="stretch">
                    {matchedEmojis.map((name, idx) => {
                      const active = idx === selectedIndex;
                      return (
                        <Box
                          id={`emo-${name}`}
                          key={name}
                          px="3"
                          py="2"
                          bg={active ? "#5865f2" : "transparent"}
                          color={active ? "white" : "gray.200"}
                          cursor="pointer"
                          _hover={{ bg: "#5865f2", color: "white" }}
                          onMouseDown={(ev) => {
                            // prevent blur
                            ev.preventDefault();
                            insertEmoji(name);
                          }}
                        >
                          <HStack spacing={3}>
                            <Box fontSize="18px">{emojiMap[name]}</Box>
                            <Text fontSize="14px" fontFamily="mono">{name}</Text>
                            <Text fontSize="12px" color="gray.400" ml="auto">:{name}:</Text>
                          </HStack>
                        </Box>
                      );
                    })}
                  </VStack>
                </Box>
              )}
            </Box>

            <IconButton
              aria-label="Send message"
              icon={<BiSend />}
              type="submit"
              size="md"
              isLoading={isSending}
              disabled={!message.trim() || isSending}
              bg="#5865f2"
              _hover={{ bg: "#4752c4" }}
              color="white"
              borderRadius="full"
            />
          </Flex>
        </form>

        <Flex mt="2" justify="space-between" align="center">
          <Text fontSize="11px" color="#b9bbbe">
            ⚠️ Do not share sensitive info in this public chat room
          </Text>
          <Text fontSize="11px" color="#b9bbbe" opacity={0.9}>
            Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for a new line
          </Text>
        </Flex>
      </Container>
    </Box>
  );
}
