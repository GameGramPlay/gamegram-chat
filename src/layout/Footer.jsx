import { Box, Grid, GridItem, Flex, Link, Text, Icon } from "@chakra-ui/react";
import { FaGithub, FaTwitter } from "react-icons/fa";
import MessageForm from "../components/MessageForm";

export default function Footer() {
  return (
    <Box
      position="fixed"
      bottom="0"
      width="100%"
      bg="#2f3136"      // Discord dark footer
      borderTop="1px solid #202225"
      zIndex={20}
    >
      {/* Message input */}
      <MessageForm />

      {/* Footer links */}
      <Grid
        gridTemplateColumns="auto 1fr auto"
        alignItems="center"
        py="2"
        px="4"
        fontSize="sm"
        color="gray.400"
      >
        {/* Left: GitHub link */}
        <GridItem>
          <Link
            href="https://gamegramplay.github.io/GameGram-website/"
            isExternal
            display="flex"
            alignItems="center"
            _hover={{ color: "white" }}
          >
            <Icon as={FaGithub} mr="1" />
            GameGram
          </Link>
        </GridItem>

        {/* Center: copyright / status */}
        <GridItem justifySelf="center">
          <Text fontSize="xs" color="gray.500">
            &copy; {new Date().getFullYear()} GameGram. All rights reserved.
          </Text>
        </GridItem>

        {/* Right: Twitter link */}
        <GridItem justifySelf="end">
          <Link
            href="https://twitter.com/gamegramplay"
            isExternal
            display="flex"
            alignItems="center"
            _hover={{ color: "#1d9bf0" }}
          >
            <Icon as={FaTwitter} mr="1" />
            Twitter
          </Link>
        </GridItem>
      </Grid>
    </Box>
  );
}
