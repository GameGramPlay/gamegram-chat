import { useState } from "react";
import { Input, IconButton, Box, Container, Flex, Text } from "@chakra-ui/react";
import { BiSend } from "react-icons/bi";
import { toaster } from "@/components/ui/toaster";
import { useAppContext } from "../context/appContext";
import supabase from "../supabaseClient";
import { emojiMap } from "/ui/emojiMap.js"; // <- import your map

export default function MessageForm() {
  const { username, country, session } = useAppContext();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Convert :emoji_name: -> emoji in real-time
  const parseEmojis = (text) => {
    return text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, p1) => {
      return emojiMap[p1] || match;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setIsSending(true);

    try {
      const { error } = await supabase.from("messages").insert([
        {
          text: parseEmojis(trimmed), // save with emojis
          username,
          country,
          is_authenticated: !!session,
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
    }
  };

  // Enter to send, Shift+Enter for newline
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  // Real-time inline parsing for display in input (optional: for preview)
  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);
  };

  return (
    <Box bg="#2f3136" py="10px" px="4">
      <Container maxW="600px">
        <form onSubmit={handleSubmit} autoComplete="off">
          <Flex
            bg="#40444b"
            borderRadius="20px"
            px="3"
            py="2"
            align="center"
          >
            <Input
              name="message"
              placeholder="Message #general"
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              bg="transparent"
              border="none"
              color="white"
              _placeholder={{ color: "#b9bbbe" }}
              resize="none"
              flex="1"
              fontSize="14px"
              mr="2"
              autoFocus
            />
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
