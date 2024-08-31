import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Select,
  Stack,
  Switch,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  VscChevronRight,
  VscFolderOpened,
  VscGist,
  VscRepoPull,
} from "react-icons/vsc";
import useStorage from "use-local-storage-state";
import Editor from "@monaco-editor/react";
import { editor } from "monaco-editor/esm/vs/editor/editor.api";
import rustpadRaw from "../rustpad-server/src/rustpad.rs?raw";
import languages from "./languages.json";
import animals from "./animals.json";
import Rustpad, { UserInfo } from "./rustpad";
import useHash from "./useHash";
import ConnectionStatus from "./ConnectionStatus";
import Footer from "./Footer";
import User from "./User";

function getWsUri(id: string) {
  return (
    (window.location.origin.startsWith("https") ? "wss://" : "ws://") +
    window.location.host +
    `/api/socket/${id}`
  );
}

function generateName() {
  return "Anonymous " + animals[Math.floor(Math.random() * animals.length)];
}

function generateHue() {
  return Math.floor(Math.random() * 360);
}
function toggleCollapse() {
  setIsCollapsed(!isCollapsed);
}
function App() {
  const toast = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [language, setLanguage] = useState("plaintext");
  const [connection, setConnection] = useState<
    "connected" | "disconnected" | "desynchronized"
  >("disconnected");
  const [users, setUsers] = useState<Record<number, UserInfo>>({});
  const [name, setName] = useStorage("name", generateName);
  const [hue, setHue] = useStorage("hue", generateHue);
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>();
  const [darkMode, setDarkMode] = useStorage("darkMode", () => false);
  const rustpad = useRef<Rustpad>();
  const id = useHash();

  useEffect(() => {
    if (editor?.getModel()) {
      const model = editor.getModel()!;
      model.setValue("");
      model.setEOL(0); // LF
      rustpad.current = new Rustpad({
        uri: getWsUri(id),
        editor,
        onConnected: () => setConnection("connected"),
        onDisconnected: () => setConnection("disconnected"),
        onDesynchronized: () => {
          setConnection("desynchronized");
          toast({
            title: "Desynchronized with server",
            description: "Please save your work and refresh the page.",
            status: "error",
            duration: null,
          });
        },
        onChangeLanguage: (language) => {
          if (languages.includes(language)) {
            setLanguage(language);
          }
        },
        onChangeUsers: setUsers,
      });
      return () => {
        rustpad.current?.dispose();
        rustpad.current = undefined;
      };
    }
  }, [id, editor, toast, setUsers]);

  useEffect(() => {
    if (connection === "connected") {
      rustpad.current?.setInfo({ name, hue });
    }
  }, [connection, name, hue]);

  function handleChangeLanguage(language: string) {
    setLanguage(language);
    if (rustpad.current?.setLanguage(language)) {
      toast({
        title: "Language updated",
        description: (
          <>
            All users are now editing in{" "}
            <Text as="span" fontWeight="semibold">
              {language}
            </Text>
            .
          </>
        ),
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(`${window.location.origin}/#${id}`);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  }

  function handleLoadSample() {
    if (editor?.getModel()) {
      const model = editor.getModel()!;
      model.pushEditOperations(
        editor.getSelections(),
        [
          {
            range: model.getFullModelRange(),
            text: rustpadRaw,
          },
        ],
        () => null
      );
      editor.setPosition({ column: 0, lineNumber: 0 });
      if (language !== "rust") {
        handleChangeLanguage("rust");
      }
    }
  }

  function handleDarkMode() {
    setDarkMode(!darkMode);
  }

  return (
    <Flex
      direction="column"
      h="100vh"
      overflow="hidden"
      bgColor={darkMode ? "#1e1e1e" : "white"}
      color={darkMode ? "#cbcaca" : "inherit"}
    >
      <Box
        flexShrink={0}
        bgColor={darkMode ? "#333333" : "#e8e8e8"}
        color={darkMode ? "#cccccc" : "#383838"}
        textAlign="center"
        fontSize="sm"
        py={0.5}
      >
        WoahAI - CoCode
      </Box>
      <Flex flex="1 0" minH={0}>
        {!isCollapsed && (
          <Container
            w="xs"
            bgColor={darkMode ? "#252526" : "#f3f3f3"}
            overflowY="auto"
            maxW="full"
            lineHeight={1.4}
            py={4}
          >
            <ConnectionStatus
              darkMode={darkMode}
              connection={connection}
            />

            <Flex justifyContent="space-between" mt={4} mb={1.5} w="full">
              <Heading size="sm">Dark Mode</Heading>
              <Switch
                isChecked={darkMode}
                onChange={handleDarkMode}
              />
            </Flex>

            <Heading mt={4} mb={1.5} size="sm">
              Language
            </Heading>
            <Select
              size="sm"
              bgColor={darkMode ? "#3c3c3c" : "white"}
              borderColor={darkMode ? "#3c3c3c" : "white"}
              value={language}
              onChange={(event) =>
                handleChangeLanguage(event.target.value)
              }
            >
              {languages.map((lang) => (
                <option
                  key={lang}
                  value={lang}
                  style={{ color: "black" }}
                >
                  {lang}
                </option>
              ))}
            </Select>

            <Heading mt={4} mb={1.5} size="sm">
              Share Link
            </Heading>
            <InputGroup size="sm">
              <Input
                readOnly
                pr="3.5rem"
                variant="outline"
                bgColor={darkMode ? "#3c3c3c" : "white"}
                borderColor={darkMode ? "#3c3c3c" : "white"}
                value={`${window.location.origin}/#${id}`}
              />
              <InputRightElement width="3.5rem">
                <Button
                  h="1.4rem"
                  size="xs"
                  onClick={handleCopy}
                  _hover={{
                    bg: darkMode ? "#575759" : "gray.200",
                  }}
                  bgColor={darkMode ? "#575759" : "gray.200"}
                >
                  Copy
                </Button>
              </InputRightElement>
            </InputGroup>

            <Heading mt={4} mb={1.5} size="sm">
              Active Users
            </Heading>
            <Stack spacing={0} mb={1.5} fontSize="sm">
              <User
                info={{ name, hue }}
                isMe
                onChangeName={(name) =>
                  name.length > 0 && setName(name)
                }
                onChangeColor={() => setHue(generateHue())}
                darkMode={darkMode}
              />
              {Object.entries(users).map(([id, info]) => (
                <User
                  key={id}
                  info={info}
                  darkMode={darkMode}
                />
              ))}
            </Stack>

            <Heading mt={4} mb={1.5} size="sm">
              About
            </Heading>
            <Text fontSize="sm" mb={1.5}>
              <strong>Rustpad</strong> is a collaborative text editor.
            </Text>
            <Text fontSize="sm" mb={1.5}>
              Edit code and other text with others at the same time.
            </Text>
            <Text fontSize="sm" mb={1.5}>
              Configured by hanisntsolo. See our{" "}
              <Link
                color="purple.600"
                fontWeight="semibold"
                href="https://github.com/hanisntsolo/rustpad"
                isExternal
              >
                GitHub
              </Link>{" "}
              for more.
            </Text>

            <Button
              size="sm"
              colorScheme={
                darkMode ? "whiteAlpha" : "blackAlpha"
              }
              borderColor={
                darkMode ? "purple.400" : "purple.600"
              }
              color={darkMode ? "purple.400" : "purple.600"}
              variant="outline"
              leftIcon={<VscRepoPull />}
              mt={1}
              onClick={handleLoadSample}
            >
              Read the code
            </Button>
          </Container>
        )}
        <Flex
          flex={1}
          minW={0}
          h="100%"
          direction="column"
          overflow="hidden"
        >
          <HStack
            h={6}
            spacing={1}
            color="#888888"
            fontWeight="medium"
            fontSize="13px"
            px={3.5}
            flexShrink={0}
          >
            <Icon
              as={VscFolderOpened}
              fontSize="md"
              color="blue.500"
            />
            <Text>documents</Text>
            <Icon as={VscChevronRight} fontSize="md" />
            <Icon
              as={VscGist}
              fontSize="md"
              color="purple.500"
            />
            <Text>{id}</Text>
          </HStack>
          <Box flex={1} minH={0}>
            <Editor
              theme={darkMode ? "vs-dark" : "vs"}
              language={language}
              options={{
                automaticLayout: true,
                fontSize: 13,
              }}
              onMount={(editor) => setEditor(editor)}
            />
          </Box>
          {isCollapsed && (
            <Button
              onClick={() => setIsCollapsed(false)}
              mt={2}
              colorScheme="purple"
              variant="outline"
              bgColor="transparent"
              _hover={{
                bgColor: darkMode ? "rgba(87, 87, 89, 0.2)" : "rgba(128, 128, 128, 0.2)",
              }}
              _active={{
                bgColor: darkMode ? "rgba(87, 87, 89, 0.4)" : "rgba(128, 128, 128, 0.4)",
              }}
              size="sm"
            >
              Expand menu
            </Button>

          )}
          {!isCollapsed && (
            <Button
              position="absolute"
              bottom=".25%"
              left="xs"
              transform="translate(-100%, -50%)"
              onClick={toggleCollapse}
              bgColor="transparent"
              _hover={{
                bgColor: darkMode ? "rgba(87, 87, 89, 0.2)" : "rgba(128, 128, 128, 0.2)",
              }}
              _active={{
                bgColor: darkMode ? "rgba(87, 87, 89, 0.4)" : "rgba(128, 128, 128, 0.4)",
              }}
            >
              {"<"}
            </Button>
          )}
        </Flex>
      </Flex>
      <Footer />
    </Flex>
  );
}

export default App;