// src/components/Chat.jsx
import {
  Badge,
  Box,
  Flex,
  Icon,
  Text,
  VStack,
  HStack,
  Divider,
  IconButton,
  Collapse,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/appContext";
import Messages from "./Messages";
import MessageForm from "./MessageForm";
import { BsChevronDoubleDown } from "react-icons/bs";
import { FiChevronDown } from "react-icons/fi";

export default function Chat() {
  // use viewport height on mount for consistent layout across browsers
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Responsive: hide left sidebar on small screens
  const showLeftSidebar = useBreakpointValue({ base: false, md: true });

  // App context (names chosen to match your provider)
  const {
    scrollRef,
    onScroll,
    scrollToBottom,
    isOnBottom,
    unviewedCount,
    currentChannel,
    typingUsers = [],
    onlineUsers = [],
  } = useAppContext();

  // Channel list collapse on small screens
  const [channelsOpen, setChannelsOpen] = useState(true);

  return (
    <Flex
      w="100%"
      h={`${viewportHeight}px`}
      bg="#36393f"
      color="white"
      overflow="hidden"
    >
      {/* Left sidebar (servers / static) */}
      {showLeftSidebar && (
        <Box
          w="72px"
          bg="#202225"
          borderRight="1px solid #2f3136"
          display="flex"
          flexDirection="column"
          alignItems="center"
          py="3"
        >
          <Box
            mb="4"
            w="48px"
            h="48px"
            bg="#5865f2"
            borderRadius="12px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontWeight="bold"
            fontSize="lg"
            boxShadow="sm"
          >
            GG
          </Box>
          {/* small guild icons */}
          <VStack spacing="3" mt="2">
            <Box w="40px" h="40px" borderRadius="10px" bg="#2f3136" />
            <Box w="40px" h="40px" borderRadius="10px" bg="#2f3136" />
            <Box w="40px" h="40px" borderRadius="10px" bg="#2f3136" />
          </VStack>
        </Box>
      )}

      {/* Channels + chat column */}
      <Flex flex="1" minW="0">
        {/* Channels column */}
        {showLeftSidebar && (
          <Box
            w="220px"
            bg="#2b2f33"
            borderRight="1px solid #2f3136"
            p="3"
            overflowY="auto"
          >
            <HStack mb="3" justify="space-between">
              <Text fontWeight="bold" color="gray.300">
                Channels
              </Text>
              <IconButton
                aria-label="toggle channels"
                size="xs"
                icon={<FiChevronDown />}
                variant="ghost"
                onClick={() => setChannelsOpen((s) => !s)}
              />
            </HStack>

            <Collapse in={channelsOpen} animateOpacity>
              <VStack spacing="1" align="stretch" mb="4">
                <Box px="2" py="2" borderRadius="md" _hover={{ bg: "#2f3136" }}>
                  # general
                </Box>
                <Box px="2" py="2" borderRadius="md" _hover={{ bg: "#2f3136" }}>
                  # random
                </Box>
                <Box px="2" py="2" borderRadius="md" _hover={{ bg: "#2f3136" }}>
                  # dev
                </Box>
              </VStack>
            </Collapse>

            <Divider borderColor="#26282b" />

            <Text mt="4" mb="2" color="gray.400" fontSize="sm">
              Members
            </Text>
            <VStack spacing="2" align="stretch">
              {onlineUsers.length === 0 ? (
                <Text color="gray.500" fontSize="sm">
                  No one online
                </Text>
              ) : (
                onlineUsers.map((u) => (
                  <HStack key={u} spacing="3">
                    <Box w="8px" h="8px" borderRadius="full" bg="#3ba55d" />
                    <Text color="gray.200" fontSize="sm">
                      {u}
                    </Text>
                  </HStack>
                ))
              )}
            </VStack>
          </Box>
        )}

        {/* Main chat column */}
        <Flex direction="column" flex="1" minW="0">
          {/* Header */}
          <Box
            bg="#2f3136"
            borderBottom="1px solid #202225"
            px={{ base: 3, md: 6 }}
            py="3"
          >
            <Flex align="center" justify="space-between">
              <Box>
                <Text fontWeight="bold" fontSize="lg">
                  {currentChannel ? `# ${currentChannel}` : "# general"}
                </Text>
                <Text color="gray.400" fontSize="sm" mt="1">
                  Channel topic or description goes here
                </Text>
              </Box>
              <Box textAlign="right">
                <Text color="gray.400" fontSize="sm">
                  {onlineUsers.length} online
                </Text>
                <Text color="gray.500" fontSize="xs">
                  Members · {onlineUsers.length}
                </Text>
              </Box>
            </Flex>
          </Box>

          {/* Messages area (flex-grow) */}
          <Flex direction="column" flex="1" minH="0" position="relative">
            {/* Scrollable messages container */}
            <Box
              ref={scrollRef}
              onScroll={onScroll}
              flex="1"
              overflowY="auto"
              bg="#2f3136"
              px={{ base: 3, md: 6 }}
              py="4"
              position="relative"
              sx={{ scrollBehavior: "smooth" }}
            >
              {/* top fade */}
              <Box
                pointerEvents="none"
                position="sticky"
                top="0"
                height="28px"
                bg="linear-gradient(to bottom, rgba(47,51,54,1), rgba(47,51,54,0))"
                zIndex={5}
              />

              {/* Messages list */}
              <Messages />

              {/* bottom fade */}
              <Box
                pointerEvents="none"
                position="sticky"
                bottom="0"
                height="28px"
                bg="linear-gradient(to top, rgba(47,51,54,1), rgba(47,51,54,0))"
                zIndex={5}
              />
            </Box>

            {/* Jump-to-bottom button */}
            {!isOnBottom && (
              <Box position="absolute" right={{ base: 16, md: 32 }} bottom="88px" zIndex={30}>
                <Flex
                  align="center"
                  bg="#5865f2"
                  color="white"
                  px="3"
                  py="1.5"
                  borderRadius="full"
                  cursor="pointer"
                  boxShadow="md"
                  _hover={{ transform: "translateY(-2px)", filter: "brightness(1.05)" }}
                  transition="all 0.15s ease"
                  onClick={() => scrollToBottom()}
                >
                  {unviewedCount > 0 && (
                    <Badge mr="2" colorScheme="red" borderRadius="full" fontSize="0.75em">
                      {unviewedCount}
                    </Badge>
                  )}
                  <Icon as={BsChevronDoubleDown} boxSize={5} />
                </Flex>
              </Box>
            )}

            {/* Typing indicator */}
            <Box px={{ base: 3, md: 6 }} py="2" minH="28px">
              {typingUsers.length > 0 && (
                <Text color="gray.400" fontSize="sm">
                  {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                </Text>
              )}
            </Box>

            {/* Message input (sticky) */}
            <Box bg="#2f3136" px={{ base: 3, md: 6 }} py="3" borderTop="1px solid #202225">
              <MessageForm />
            </Box>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
