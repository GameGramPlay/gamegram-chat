import { Box, Flex, Text, Image, Icon, HStack, Tooltip, ScaleFade } from "@chakra-ui/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MdVerified } from "react-icons/md";
import twemoji from "twemoji"; // for emoji parsing
import { truncateText } from "../utils";

dayjs.extend(relativeTime);

// Utility: parse emoji shortcodes like :smile: into Unicode
function parseEmojis(text) {
  if (!text) return "";
  // Basic regex for :emoji:
  return twemoji.parse(
    text.replace(/:([a-zA-Z0-9_+-]+):/g, (_, name) => {
      try {
        return twemoji.convert.fromCodePoint(name); // twemoji conversion
      } catch {
        return `:${name}:`;
      }
    }),
    { folder: "svg", ext: ".svg" }
  );
}

export default function Message({ message, isYou, showUsername = true, showStatus = true }) {
  const countryCode =
    message.country && message.country !== "undefined"
      ? message.country.toLowerCase()
      : "";

  const bubbleBg = isYou ? "#3ba55d" : "#36393f"; 
  const textColor = isYou ? "white" : "gray.200";

  return (
    <ScaleFade in={true} initialScale={0.95} delay={0.05}>
      <Flex
        mb="2"
        justify={isYou ? "flex-end" : "flex-start"}
        align="flex-start"
        w="100%"
        px="2"
      >
        {/* Optional user online/offline dot */}
        {showStatus && !isYou && (
          <Box
            w="10px"
            h="10px"
            bg={message.online ? "#43b581" : "#747f8d"}
            borderRadius="full"
            mt="4px"
            mr="2"
          />
        )}

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
          boxShadow="0 1px 2px rgba(0,0,0,0.2)"
          _hover={{ filter: "brightness(1.05)" }}
          transition="all 0.2s ease"
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
            transition="all 0.2s ease"
          />

          {/* Username + verified + country */}
          {showUsername && (
            <Flex align="center" mb="1" flexWrap="wrap">
              <HStack spacing={1}>
                <Text fontWeight="600" fontSize="sm" color={textColor}>
                  {message.username}
                </Text>
                {message.is_authenticated && (
                  <Tooltip label="Verified" placement="top">
                    <Icon as={MdVerified} color="#1d9bf0" w={4} h={4} />
                  </Tooltip>
                )}
                {countryCode && (
                  <Tooltip label={`From ${message.country}`} placement="top">
                    <Image
                      src={`/flags/${countryCode}.png`}
                      alt={message.country}
                      w="16px"
                      h="11px"
                      borderRadius="2px"
                    />
                  </Tooltip>
                )}
              </HStack>
            </Flex>
          )}

          {/* Message text with inline emojis */}
          <Text
            fontSize="md"
            whiteSpace="pre-wrap"
            wordBreak="break-word"
            dangerouslySetInnerHTML={{ __html: parseEmojis(truncateText(message.text)) }}
          />

          {/* Reactions (emojis below message) */}
          {message.reactions && message.reactions.length > 0 && (
            <Flex mt="1" wrap="wrap">
              {message.reactions.map((r, idx) => (
                <Flex
                  key={idx}
                  bg="#4f545c"
                  px="2"
                  py="1"
                  borderRadius="12px"
                  mr="1"
                  mb="1"
                  fontSize="xs"
                  align="center"
                  cursor="pointer"
                  _hover={{ bg: "#5f6570" }}
                >
                  <Text mr="1">{r.emoji}</Text>
                  <Text>{r.count}</Text>
                </Flex>
              ))}
            </Flex>
          )}

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
    </ScaleFade>
  );
}
