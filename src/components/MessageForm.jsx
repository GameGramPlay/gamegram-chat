import { useState, useRef } from "react";
import {
  Input,
  IconButton,
  Box,
  Container,
  Flex,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useOutsideClick } from "@chakra-ui/hooks";
import { BiSend } from "react-icons/bi";
import { toaster } from "@/components/ui/toaster";
import { useAppContext } from "../context/appContext";
import supabase from "../supabaseClient";
import { emojiMap } from "./ui/emojiMap";

export default function MessageForm() {
  const { username, country, session, currentChannel } = useAppContext();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [emojiQuery, setEmojiQuery] = useState("");
  const [matchedEmojis, setMatchedEmojis] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const detectEmojiQuery = (text, cursorPos) => {
    const leftText = text.slice(0, cursorPos);
    const match = leftText.match(/:([a-zA-Z0-9_+-]*)$/);
    return match ? match[1] : "";
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    const cursorPos = e.target.selectionStart;
    const query = detectEmojiQuery(value, cursorPos);
    setEmojiQuery(query);

    if (query.length > 0) {
      const matches = Object.keys(emojiMap).filter((name) =>
        name.startsWith(query)
      );
      setMatchedEmojis(matches);
      setSelectedIndex(0);
    } else {
      setMatchedEmojis([]);
    }
  };

  const insertEmoji = (emojiName) => {
    const emoji = emojiMap[emojiName] || "";
    const cursorPos = inputRef.current.selectionStart;
    const leftText = message.slice(0, cursorPos);
    const rightText = message.slice(cursorPos);
    const newLeft = leftText.replace(/:([a-zA-Z0-9_+-]*)$/, emoji);
    setMessage(newLeft + rightText);
    setEmojiQuery("");
    setMatchedEmojis([]);

    setTimeout(() => {
      inputRef.current.selectionStart = inputRef.current.selectionEnd = newLeft.length;
      inputRef.current.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (matchedEmojis.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % matchedEmojis.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + matchedEmojis.length) % matchedEmojis.length
        );
      } else if (e.key === "Enter") {
        if (emojiQuery.length > 0) {
          e.preventDefault();
          insertEmoji(matchedEmojis[selectedIndex]);
          return;
        }
      }
    }

    if (e.key === "Enter" && !e.shiftKey && emojiQuery.length === 0) {
      handleSubmit(e);
    }
  };

  useOutsideClick({
    ref: autocompleteRef,
    handler: () => setMatchedEmojis([]),
  });

  const parseEmojis = (text) =>
    text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, p1) => emojiMap[p1] || match);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setIsSending(true);

    try {
      const { error } = await supabase.from("messages").insert([
        {
          text: parseEmojis(trimmed),
          username,
          country,
          is_authenticated: !!session,
          channel_id: currentChannel?.id ?? 1,
        },
      ]);
      if (error) {
        toaster.create({
          title: "Error sending",
          description: error.message,
          status: "error",
          duration: 9000,
          isClosable: true,
          color: "white",
          background: "#ef4444",
        });
        return;
      }

      setMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
      setMatchedEmojis([]);
      setEmojiQuery("");
    }
  };

  return (
    <Box bg="#2f3136" py="10px" px="4">
      <Container maxW="600px">
        <form onSubmit={handleSubmit} autoComplete="off">
          <Flex bg="#40444b" borderRadius="20px" px="3" py="2" align="center">
            <Box flex="1" position="relative">
              <Input
                name="message"
                placeholder={`Message ${currentChannel ? `#${currentChannel.name}` : "#general"}`}
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                bg="transparent"
                border="none"
                color="white"
                _placeholder={{ color: "#b9bbbe" }}
                fontSize="14px"
                autoFocus
                ref={inputRef}
              />

              {matchedEmojis.length > 0 && (
                <Box
                  position="absolute"
                  bottom="100%"
                  left="0"
                  bg="#202225"
                  borderRadius="8px"
                  boxShadow="0 0 5px rgba(0,0,0,0.5)"
                  mt="1"
                  zIndex={50}
                  ref={autocompleteRef}
                  maxH="200px"
                  overflowY="auto"
                  width="220px"
                >
                  <VStack spacing="0" align="stretch">
                    {matchedEmojis.map((name, idx) => (
                      <Box
                        key={name}
                        px="3"
                        py="1"
                        bg={idx === selectedIndex ? "#5865f2" : "transparent"}
                        color={idx === selectedIndex ? "white" : "gray.200"}
                        cursor="pointer"
                        _hover={{ bg: "#5865f2", color: "white" }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertEmoji(name);
                        }}
                      >
                        {emojiMap[name]} {name}
                      </Box>
                    ))}
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
              disabled={!message.trim()}
              bg="#5865f2"
              _hover={{ bg: "#4752c4" }}
              color="white"
              borderRadius="full"
            />
          </Flex>
        </form>

        <Text fontSize="10px" color="#b9bbbe" mt="2">
          ⚠️ Do not share sensitive info in this public chat room
        </Text>
      </Container>
    </Box>
  );
}
