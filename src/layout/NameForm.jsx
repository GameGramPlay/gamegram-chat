import { useEffect, useRef, useState } from "react";
import { Input, Stack, IconButton, Box, Text } from "@chakra-ui/react";
import { BiSave, BiEdit } from "react-icons/bi";
import { useAppContext } from "../context/appContext";

export default function NameForm() {
  const { username, setUsername } = useAppContext();
  const [newUsername, setNewUsername] = useState(username);
  const [isEditing, setIsEditing] = useState(false);

  const inputRef = useRef(null);

  // Auto-focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  // Sync with context username
  useEffect(() => setNewUsername(username), [username]);

  const toggleEditing = () => setIsEditing((prev) => !prev);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setNewUsername(username);
      setIsEditing(false);
      return;
    }
    setUsername(newUsername.trim());
    localStorage.setItem("username", newUsername.trim());
    setIsEditing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack direction="row" spacing={2} align="center">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter username"
            size="sm"
            maxLength={15}
            bg="#202225"         // Discord dark input
            color="white"
            border="1px solid #4f545c"
            _focus={{ borderColor: "#7289da" }}
            onBlur={handleSubmit}
          />
        ) : (
          <Box
            onClick={toggleEditing}
            cursor="pointer"
            _hover={{ opacity: 0.8 }}
          >
            <Text fontSize="sm" color="gray.300">
              Welcome <strong>{newUsername}</strong>
            </Text>
          </Box>
        )}

        <IconButton
          size="sm"
          aria-label={isEditing ? "Save username" : "Edit username"}
          icon={isEditing ? <BiSave /> : <BiEdit />}
          onClick={(e) => {
            e.preventDefault();
            isEditing ? handleSubmit(e) : toggleEditing();
          }}
          variant="ghost"
          colorScheme="teal"
          _hover={{ bg: "#3ba55d", color: "white" }}
        />
      </Stack>
    </form>
  );
}
