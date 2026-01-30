import { Box, Flex, Text, Image, Icon, HStack } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MdVerified } from "react-icons/md";
import { emojiMap } from "./ui/emojiMap.js";

dayjs.extend(relativeTime);

const fadeInSlide = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const parseEmojis = (text) => {
  if (!text) return "";
  return text.replace(/:([a-zA-Z0-9_+-]+):/g, (_, code) => emojiMap[code] || `:${code}:`);
};

export default function Message({ message, prevMessage, isYou }) {
  const showAvatar = !prevMessage || prevMessage.username !== message.username;
  const countryCode = message.country && message.country !== "undefined" ? message.country.toLowerCase() : "";

  const bubbleBg = isYou ? "#3ba55d" : "#36393f";
  const textColor = isYou ? "white" : "gray.200";

  return (
    <Flex
      mb={showAvatar ? "4" : "1"}
      justify={isYou ? "flex-end" : "flex-start"}
      align="flex-start"
      w="100%"
      px="2"
      animation={`${fadeInSlide} 0.2s ease-out`}
    >
      {/* Avatar */}
      {!isYou && showAvatar && (
        <Box mr="2">
          <Image
            src={`/avatars/${message.username}.png`}
            alt={message.username}
            w="36px"
            h="36px"
            borderRadius="full"
          />
        </Box>
      )}

      <Box maxW="70%" position="relative">
        {/* Username + verified + country */}
        {!isYou && showAvatar && (
          <Flex align="center" mb="1" flexWrap="wrap">
            <Text fontWeight="600" fontSize="sm" mr="1" color="white">
              {message.username}
            </Text>
            {message.is_authenticated && (
              <Icon as={MdVerified} color="#1d9bf0" w={4} h={4} mr="1" />
            )}
            {countryCode && (
              <HStack spacing="1" fontSize="xs" color="gray.400">
                <Text>from {message.country}</Text>
                <Image
                  src={`/flags/${countryCode}.png`}
                  alt={message.country}
                  w="16px"
                  h="11px"
                  borderRadius="2px"
                />
              </HStack>
            )}
          </Flex>
        )}

        {/* Message bubble */}
        <Box
          bg={bubbleBg}
          color={textColor}
          px="3"
          py="2"
          borderRadius="16px"
          borderTopLeftRadius={isYou ? "16px" : showAvatar ? "4px" : "16px"}
          borderTopRightRadius={isYou ? (showAvatar ? "4px" : "16px") : "16px"}
          boxShadow="sm"
          _hover={{ filter: "brightness(1.05)" }}
        >
          <Text fontSize="md" whiteSpace="pre-wrap" wordBreak="break-word">
            {parseEmojis(message.text)}
          </Text>

          {/* Timestamp */}
          <Text fontSize="xs" color={isYou ? "gray.200" : "gray.400"} mt="1" textAlign="right">
            {dayjs(message.timestamp).fromNow()}
          </Text>

          {/* Reactions placeholder */}
          {message.reactions && message.reactions.length > 0 && (
            <HStack mt="1" spacing="1">
              {message.reactions.map((r) => (
                <Box
                  key={r.emoji}
                  bg="#4f545c"
                  px="2"
                  py="0.5"
                  borderRadius="12px"
                  fontSize="xs"
                  color="white"
                  cursor="pointer"
                  _hover={{ bg: "#5865f2" }}
                >
                  {r.emoji} {r.count}
                </Box>
              ))}
            </HStack>
          )}
        </Box>
      </Box>
    </Flex>
  );
}
