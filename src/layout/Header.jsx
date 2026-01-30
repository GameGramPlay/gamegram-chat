import { Button, Grid, GridItem, Image, HStack, Text } from "@chakra-ui/react";
import { FaGithub } from "react-icons/fa";
import supabase from "../supabaseClient";
import { ColorModeButton } from "@/components/ui/color-mode";

import { useAppContext } from "../context/appContext";
import NameForm from "./NameForm";

export default function Header() {
  const { username, setUsername, randomUsername, session } = useAppContext();

  return (
    <Grid
      templateColumns="max-content 1fr max-content"
      alignItems="center"
      bg="#1e1e2f"
      px="4"
      py="2"
      position="sticky"
      top="0"
      zIndex="10"
      borderBottom="1px solid #2f3136"
      boxShadow="sm"
    >
      {/* Logo */}
      <GridItem justifySelf="start">
        <HStack spacing="2">
          <Image src="/logo.png" height="36px" />
          <Text fontWeight="bold" color="white" fontSize="lg">
            MyApp
          </Text>
        </HStack>
      </GridItem>

      {/* Spacer */}
      <GridItem />

      {/* User section */}
      <GridItem justifySelf="end">
        <HStack spacing="3">
          {session ? (
            <>
              <Text color="white">
                Welcome <strong>{username}</strong>
              </Text>
              <Button
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: "#2f3136" }}
                onClick={() => {
                  const { error } = supabase.auth.signOut();
                  if (error) return console.error("error signOut", error);
                  const newUsername = randomUsername();
                  setUsername(newUsername);
                  localStorage.setItem("username", newUsername);
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <NameForm username={username} setUsername={setUsername} />
              <Button
                size="sm"
                colorScheme="teal"
                variant="solid"
                leftIcon={<FaGithub />}
                onClick={() =>
                  supabase.auth.signInWithOAuth({
                    provider: "github",
                    redirectTo: window.location.origin,
                  })
                }
              >
                Login
              </Button>
            </>
          )}
        </HStack>
      </GridItem>
    </Grid>
  );
}
