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
        bg="#ffffff"          // fixed light background
        p="5"
        overflowY="auto"
        borderRadius="10px"
        border="1px solid #e2e8f0"
        height={height}
        onScroll={onScroll}
        ref={scrollRef}
        position="relative"
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
              bg="#1d9bf0"                // fixed blue for jump button
              color="white"
              px="3"
              py="1.5"
              borderRadius="full"
              cursor="pointer"
              boxShadow="md"
              _hover={{ filter: "brightness(1.1)" }}
              transition="all 0.15s ease"
              onClick={scrollToBottom}
            >
              {unviewedMessageCount > 0 && (
                <Badge
                  mr="2"
                  colorScheme="green"
                  borderRadius="full"
                  fontSize="0.75em"
                >
                  {unviewedMessageCount}
                </Badge>
              )}
              <Icon as={BsChevronDoubleDown} />
            </Flex>
          </Flex>
        )}
      </Box>
    </Container>
  );
}
