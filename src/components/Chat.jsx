import { Badge, Box, Container, Flex, Icon } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/appContext";
import Messages from "./Messages";
import { BsChevronDoubleDown } from "react-icons/bs";

export default function Chat() {
  const [height, setHeight] = useState(window.innerHeight - 100);

  const {
    scrollRef,
    onScroll,
    scrollToBottom,
    isOnBottom,
    unviewedMessageCount,
  } = useAppContext();

  // Adjust height on window resize
  useEffect(() => {
    const handleResize = () => setHeight(window.innerHeight - 100);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Container maxW="600px" pb="20px">
      <Box
        bg="#2f3136" // Discord dark background
        borderRadius="md"
        border="1px solid #202225"
        height={`${height}px`}
        overflowY="auto"
        position="relative"
        ref={scrollRef}
        onScroll={onScroll}
        boxShadow="0 0 20px rgba(0,0,0,0.3)"
        sx={{
          scrollBehavior: "smooth",
        }}
      >
        {/* Top gradient shadow */}
        <Box
          position="sticky"
          top="0"
          height="24px"
          bg="linear-gradient(to bottom, #2f3136, transparent)"
          pointerEvents="none"
          zIndex={5}
        />

        <Messages />

        {/* Bottom gradient shadow */}
        <Box
          position="sticky"
          bottom="0"
          height="24px"
          bg="linear-gradient(to top, #2f3136, transparent)"
          pointerEvents="none"
          zIndex={5}
        />

        {/* Scroll to bottom button */}
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
              _hover={{ transform: "scale(1.05)", filter: "brightness(1.15)" }}
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
    </Container>
  );
}
