// src/components/Message.jsx
import { Box, Flex, Text, Image, Icon, HStack, Tooltip } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MdVerified } from "react-icons/md";
import { emojiMap } from "./ui/emojiMap";
import { useAppContext } from "../context/appContext";

dayjs.extend(relativeTime);

const fadeInSlide = keyframes`
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const parseEmojis = (text) => {
  if (!text) return "";
  // Replace :emoji_name: with Unicode
  return text.replace(/:([a-zA-Z0-9_+-]+):/g, (_, code) => emojiMap[code] || `:${code}:`);
};

export default function Message({ message, prevMessage, isYou }) {
  const { toggleReaction, username: me } = useAppContext();
  const showAvatar = !prevMessage || prevMessage.username !== message.username;

  const bubbleBg = isYou ? "#3ba55d" : "#36393f";
  const textColor = isYou ? "white" : "gray.200";

  // format reactions into unique list with counts
  const reactionCountMap = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = acc[r.emoji] || { count: 0, byMe: false };
    acc[r.emoji].count += 1;
    if (r.username === me) acc[r.emoji].byMe = true;
    return acc;
  }, {});

  const reactionList = Object.keys(reactionCountMap).map((emoji) => ({
    emoji,
    ...reactionCountMap[emoji],
  }));

  return (
    <Flex
      mb={showAvatar ? 4 : 1}
      justify={isYou ? "flex-end" : "flex-start"}
      align="flex-start"
      w="100%"
      px="2"
      animation={`${fadeInSlide} 0.14s ease-out`}
    >
      {/* avatar column */}
      {!isYou && showAvatar ? (
        <Box mr="3" mt="1">
          <Image
            src={`/avatars/${encodeURIComponent(message.username)}.png`}
            alt={message.username}
            w="36px"
            h="36px"
            borderRadius="full"
            fallbackSrc="/avatars/default.png"
          />
        </Box>
      ) : (
        <Box w="39px" mr="3" />
      )}

      <Box maxW="78%">
        {/* header (username + verified) */}
        {!isYou && showAvatar && (
          <Flex align="center" mb="1" gap="2">
            <Text fontWeight="600" fontSize="sm" color="white">
              {message.username}
            </Text>
            {message.is_authenticated && (
              <Tooltip label="Verified">
                <Icon as={MdVerified} color="#1d9bf0" w={4} h={4} />
              </Tooltip>
            )}
            <Text fontSize="xs" color="gray.400">
              {dayjs(message.timestamp).format("HH:mm")}
            </Text>
          </Flex>
        )}

        {/* bubble */}
        <Box
          bg={bubbleBg}
          color={textColor}
          px="3"
          py="2"
          borderRadius="12px"
          borderTopLeftRadius={isYou ? "12px" : showAvatar ? "6px" : "12px"}
          borderTopRightRadius={isYou ? (showAvatar ? "6px" : "12px") : "12px"}
          boxShadow="0 1px 0 rgba(0,0,0,0.25)"
        >
          <Text fontSize="14px" whiteSpace="pre-wrap" wordBreak="break-word">
            {parseEmojis(message.text)}
          </Text>
        </Box>

        {/* reactions row */}
        <HStack spacing="2" mt="2">
          {reactionList.map((r) => (
            <Box
              key={r.emoji}
              px="2"
              py="0.5"
              borderRadius="12px"
              bg={r.byMe ? "#5865f2" : "#2f3136"}
              color={r.byMe ? "white" : "gray.200"}
              fontSize="13px"
              cursor="pointer"
              _hover={{ transform: "translateY(-2px)" }}
              onClick={() => toggleReaction({ messageId: message.id, emoji: r.emoji })}
            >
              {r.emoji} <Box as="span" ml="1">{r.count}</Box>
            </Box>
          ))}

          {/* quick add common emojis */}
          <Box
            px="2"
            py="0.5"
            borderRadius="12px"
            bg="#2f3136"
            color="gray.200"
            fontSize="13px"
            cursor="pointer"
            _hover={{ bg: "#3a3f45" }}
            onClick={() => toggleReaction({ messageId: message.id, emoji: "👍" })}
          >
            👍
          </Box>
          <Box
            px="2"
            py="0.5"
            borderRadius="12px"
            bg="#2f3136"
            color="gray.200"
            fontSize="13px"
            cursor="pointer"
            _hover={{ bg: "#3a3f45" }}
            onClick={() => toggleReaction({ messageId: message.id, emoji: "❤️" })}
          >
            ❤️
          </Box>
        </HStack>
      </Box>
    </Flex>
  );
}
