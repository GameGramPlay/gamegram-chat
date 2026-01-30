import {
  Badge,
  Box,
  Container,
  Flex,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { BsChevronDoubleDown } from "react-icons/bs";
import { useAppContext } from "../context/appContext";
import Messages from "./Messages";

export default function Chat() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const {
    scrollRef,
    onScroll,
    scrollToBottom,
    isOnBottom,
    unviewedMessageCount,
  } = useAppContext();

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        setHeight(containerRef.current.offsetHeight);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const bg = useColorModeValue("gray.100", "gray.800");
  const chatBg = useColorModeValue("white", "gray.900");
  const jumpBg = useColorModeValue("gray.700", "gray.600");

  return (
    <Container
      maxW="700px"
      p="0"
      ref={containerRef}
      height="calc(100vh - 140px)"
      display="flex"
      flexDir="column"
    >
      <Box
        flex="1"
        bg={chatBg}
        px="4"
        py="3"
        overflowY="auto"
        borderRadius="md"
        border="1px solid"
        borderColor={useColorModeValue("gray.200", "gray.700")}
        onScroll={onScroll}
        ref={scrollRef}
        position="relative"
      >
        <Messages />

        {!isOnBottom && (
          <Flex
            position="sticky"
            bottom="16px"
            justify="center"
            zIndex={10}
            pointerEvents="none"
          >
            <Flex
              pointerEvents="auto"
              align="center"
              bg={jumpBg}
              color="white"
              px="3"
              py="1.5"
              borderRadius="full"
              cursor="pointer"
              boxShadow="md"
              _hover={{ transform: "translateY(-1px)", bg: "gray.500" }}
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
