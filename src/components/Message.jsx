import { Box, Flex, Text, Image, Icon, keyframes } from "@chakra-ui/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MdVerified } from "react-icons/md";

dayjs.extend(relativeTime);

// Shortcode map for Discord-like emojis
const EMOJI_MAP = {
  smile: "😄",
  heart: "❤️",
  thumbsup: "👍",
  wink: "😉",
  fire: "🔥",
  star: "⭐",
};

// Convert :emoji: shortcodes to actual Unicode emojis
function parseShortcodes(text) {
  return text.replace(/:([a-zA-Z0-9_+-]+):/g, (_, name) => EMOJI_MAP[name] || `:${name}:`);
}

// Fade in + slide animation for messages
const fadeInSlide = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

export default function Message({ message, isYou, showUsername = true }) {
  const countryCode =
    message.country && message.country !== "undefined"
      ? message.country.toLowerCase()
      : "";

  const bubbleBg = isYou ? "#3ba55d" : "#36393f"; // green for self, dark gray for others
  const textColor = isYou ? "white" : "gray.200";

  return (
    <Flex
      mb="2"
      justify={isYou ? "flex-end" : "flex-start"}
      align="flex-start"
      w="100%"
      px="2"
      animation={`${fadeInSlide} 0.2s ease-out`}
    >
      <Box
        position="relative"
        maxW="70%"
        bg={bubbleBg}
        color={textColor}
        px="3"
        py="2"
        borderRadius="16px"
        borderTopLeftRadius={isYou ? "16px" : "4px"}
        borderTopRightRadius={isYou ? "4px" : "16px"}
        boxShadow="sm"
        _hover={{ filter: "brightness(1.05)" }}
      >
        {/* Pointer triangle */}
        <Box
          position="absolute"
          top="0"
          left={isYou ? "auto" : "-8px"}
          right={isYou ? "-8px" : "auto"}
          width={0}
          height={0}
          borderStyle="solid"
          borderWidth={isYou ? "0 0 10px 10px" : "0 10px 10px 0"}
          borderColor={
            isYou
              ? `transparent transparent transparent ${bubbleBg}`
              : `transparent ${bubbleBg} transparent transparent`
          }
        />

        {/* Username + verified + country */}
        {showUsername && (
          <Flex align="center" mb="1" flexWrap="wrap">
            <Text fontWeight="600" fontSize="sm" mr="1">
              {message.username}
            </Text>
            {message.is_authenticated && (
              <Icon as={MdVerified} color="#1d9bf0" w={4} h={4} mr="1" />
            )}
            {countryCode && (
              <Flex
                align="center"
                fontSize="xs"
                color={isYou ? "gray.200" : "gray.400"}
              >
                from {message.country}
                <Image
                  src={`/flags/${countryCode}.png`}
                  alt={message.country}
                  w="16px"
                  h="11px"
                  ml="1"
                  mt="-1px"
                  borderRadius="2px"
                />
              </Flex>
            )}
          </Flex>
        )}

        {/* Message text with emojis */}
        <Text fontSize="md" whiteSpace="pre-wrap" wordBreak="break-word">
          {parseShortcodes(message.text)}
        </Text>

        {/* Timestamp */}
        <Text
          fontSize="xs"
          color={isYou ? "gray.200" : "gray.400"}
          mt="1"
          textAlign="right"
        >
          {dayjs(message.timestamp).fromNow()}
        </Text>
      </Box>
    </Flex>
  );
}
