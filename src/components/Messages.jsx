import { Alert, Box, Button, Spinner, VStack } from "@chakra-ui/react";
import { useAppContext } from "../context/appContext";
import Message from "./Message";

export default function Messages() {
  const { username, loadingInitial, error, getMessagesAndSubscribe, messages } =
    useAppContext();

  const reversed = [...messages].reverse();

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

  if (!messages.length)
    return (
      <Box as="h3" textAlign="center" mt="20px" color="gray.400">
        No messages 😞
      </Box>
    );

  return (
    <VStack
      spacing={2}
      align="stretch"
      bg="gray.900"
      p={4}
      borderRadius="md"
      h="calc(100vh - 100px)"
      overflowY="auto"
    >
      {reversed.map((message) => {
        const isYou = message.username === username;
        return (
          <Message
            key={message.id}
            message={message}
            isYou={isYou}
            style={{
              alignSelf: isYou ? "flex-end" : "flex-start",
              maxWidth: "70%",
            }}
          />
        );
      })}
    </VStack>
  );
}
