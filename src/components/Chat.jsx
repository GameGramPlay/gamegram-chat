import { Badge, Box, Container, Flex, Icon } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/appContext";
import Messages from "./Messages";
import { BsChevronDoubleDown } from "react-icons/bs";

export default function Chat() {
  const [height, setHeight] = useState(window.innerHeight - 205);

  const {
    scrollRef,
    onScroll,
    scrollToBottom,
    isOnBottom,
    unviewedMessageCount,
  } = useAppContext();

  // Adjust height on window resize
  useEffect(() => {
    const handleResize = () => setHeight(window.innerHeight - 205);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Container maxW="600px" pb="20px">
      <Box
        bg="gray.800"             // dark Discord-style background
        p="4"
        overflowY="auto"
        borderRadius="md"
        border="1px solid #2f3136" // subtle dark border
        height={height}
        onScroll={onScroll}
        ref={scrollRef}
        position="relative"
        boxShadow="lg"
      >
        <Messages />

        {!isOnBottom && (
          <Flex
            position="sticky"
            bottom="16px"
            justify="flex-end"
            width="100%"
            zIndex={10}
          >
            <Flex
              align="center"
              bg="#5865f2"               // Discord blue
              color="white"
              px="3"
              py="1.5"
              borderRadius="full"
              cursor="pointer"
              boxShadow="md"
              _hover={{ filter: "brightness(1.15)" }}
              transition="all 0.15s ease"
              onClick={scrollToBottom}
            >
              {unviewedMessageCount > 0 && (
                <Badge
                  mr="2"
                  colorScheme="red"
                  borderRadius="full"
                  fontSize="0.75em"
                >
                  {unviewedMessageCount}
                </Badge>
              )}
              <Icon as={BsChevronDoubleDown} boxSize={5} />
            </Flex>
          </Flex>
        )}
      </Box>
    </Container>
  );
}
