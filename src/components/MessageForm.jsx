import { Box, Flex, Icon, Text, VStack, Badge } from "@chakra-ui/react";
import { BsChevronDoubleDown } from "react-icons/bs";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/appContext";
import Messages from "./Messages";
import MessageForm from "./MessageForm";

export default function ChatContainer() {
  const [height, setHeight] = useState(window.innerHeight - 60); // adjust for header/menu
  const {
    scrollRef,
    onScroll,
    scrollToBottom,
    isOnBottom,
    unviewedMessageCount,
    currentChannel,
  } = useAppContext();

  useEffect(() => {
    const handleResize = () => setHeight(window.innerHeight - 60);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Flex w="100%" h={`${height}px`} bg="#36393f">
      {/* Sidebar placeholder */}
      <Box
        w="220px"
        bg="#202225"
        borderRight="1px solid #2f3136"
        p="4"
        display={{ base: "none", md: "block" }}
      >
        <Text color="gray.300" fontWeight="bold" mb="4">
          Channels
        </Text>
        <VStack spacing="2" align="stretch">
          <Box px="2" py="1" borderRadius="md" _hover={{ bg: "#2f3136" }}>
            # general
          </Box>
          <Box px="2" py="1" borderRadius="md" _hover={{ bg: "#2f3136" }}>
            # random
          </Box>
        </VStack>
      </Box>

      {/* Main chat area */}
      <Flex flex="1" direction="column" bg="#2f3136" borderRadius="md">
        {/* Header */}
        <Flex
          align="center"
          justify="space-between"
          bg="#2f3136"
          p="3"
          borderBottom="1px solid #202225"
        >
          <Text fontWeight="bold" color="white">
            {currentChannel ? `# ${currentChannel}` : "# general"}
          </Text>
          <Text color="gray.400" fontSize="sm">
            12 online
          </Text>
        </Flex>

        {/* Messages scrollable area */}
        <Box
          flex="1"
          overflowY="auto"
          position="relative"
          ref={scrollRef}
          onScroll={onScroll}
          px="4"
          py="2"
          sx={{ scrollBehavior: "smooth" }}
        >
          {/* Top gradient */}
          <Box
            position="sticky"
            top="0"
            height="24px"
            bg="linear-gradient(to bottom, #2f3136, transparent)"
            pointerEvents="none"
            zIndex={5}
          />

          <Messages />

          {/* Bottom gradient */}
          <Box
            position="sticky"
            bottom="0"
            height="24px"
            bg="linear-gradient(to top, #2f3136, transparent)"
            pointerEvents="none"
            zIndex={5}
          />

          {/* Scroll-to-bottom button */}
          {!isOnBottom && (
            <Flex
              position="sticky"
              bottom="16px"
              justify="flex-end"
              width="100%"
              zIndex={10}
              pointerEvents="none"
            >
              <Flex
                align="center"
                bg="#5865f2"
                color="white"
                px="3"
                py="1.5"
                borderRadius="full"
                cursor="pointer"
                boxShadow="md"
                pointerEvents="auto"
                _hover={{
                  transform: "scale(1.05)",
                  filter: "brightness(1.15)",
                }}
                transition="all 0.2s ease"
                onClick={scrollToBottom}
              >
                {unviewedMessageCount > 0 && (
                  <Badge
                    mr="2"
                    colorScheme="red"
                    borderRadius="full"
                    fontSize="0.75em"
                    transition="all 0.2s ease"
                  >
                    {unviewedMessageCount}
                  </Badge>
                )}
                <Icon as={BsChevronDoubleDown} boxSize={5} />
              </Flex>
            </Flex>
          )}
        </Box>

        {/* Message form at the bottom */}
        <Box px="4" py="2" flexShrink={0} bg="#2f3136">
          <MessageForm />
        </Box>
      </Flex>
    </Flex>
  );
}
