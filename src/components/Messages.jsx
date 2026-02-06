import React, { useEffect, useMemo, useRef } from "react";
import { Alert, Box, Button, Spinner, VStack } from "@chakra-ui/react";
import { useAppContext } from "../context/appContext";
import Message from "./Message";

export default function Messages() {
  const {
    username,
    loadingInitial,
    error,
    getMessagesAndSubscribe,
    messages,
  } = useAppContext();

  // container ref for scroll handling
  const containerRef = useRef(null);
  // track whether user is at (or near) bottom so we don't force-scroll when user is reading history
  const isAtBottomRef = useRef(true);

  // Memoize sorted messages (chronological: oldest first)
  const orderedMessages = useMemo(() => {
    // copy and sort by timestamp (safe-guard when timestamp missing)
    return [...(messages || [])].sort((a, b) => {
      const ta = a?.timestamp ? Date.parse(a.timestamp) : 0;
      const tb = b?.timestamp ? Date.parse(b.timestamp) : 0;
      return ta - tb;
    });
  }, [messages]);

  // Keep isAtBottomRef updated by user scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      // if distance from bottom is less than 100px we treat as 'at bottom'
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      isAtBottomRef.current = atBottom;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    // init
    onScroll();

    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll when messages change BUT only if user was at bottom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (isAtBottomRef.current) {
      // use smooth scroll for nicer UX
      // setTimeout used to ensure DOM painted new items (helps with images/attachments)
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    }
  }, [orderedMessages.length]); // only depends on number of messages

  if (loadingInitial)
    return (
      <Box textAlign="center" mt="20px">
        <Spinner size="xl" color="teal.400" />
      </Box>
    );

  if (error)
    return (
      <Alert status="error" mt="20px" borderRadius="md">
        <Box>
          {error}
          <Button
            ml="5px"
            onClick={getMessagesAndSubscribe}
            colorScheme="red"
            variant="link"
          >
            try to reconnect
          </Button>
        </Box>
      </Alert>
    );

  if (!orderedMessages.length)
    return (
      <Box as="h3" textAlign="center" mt="20px" color="gray.400">
        No messages 😞
      </Box>
    );

  return (
    <VStack
      spacing={1}
      align="stretch"
      bg="gray.900"
      p={4}
      borderRadius="md"
      h="calc(100vh - 100px)"
      overflowY="auto"
      id="messages-container"
      ref={containerRef}
    >
      {orderedMessages.map((message, idx) => {
        const isYou = message.username === username;
        const prevMessage = idx > 0 ? orderedMessages[idx - 1] : null;

        // show username when the previous message is from a different user
        // or when the time gap between messages is > 5 minutes
        const showUsername =
          !prevMessage ||
          prevMessage.username !== message.username ||
          (message.timestamp &&
            prevMessage.timestamp &&
            Math.abs(Date.parse(message.timestamp) - Date.parse(prevMessage.timestamp)) >
              1000 * 60 * 5); // 5 minutes

        return (
          <Message
            key={message.id}
            message={message}
            isYou={isYou}
            prevMessage={prevMessage}
            showUsername={showUsername}
          />
        );
      })}
    </VStack>
  );
}
