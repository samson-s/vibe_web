'use client';
import { useState } from 'react';
import { Box, Button, Input, Stack, Text, Field, Alert, Flex } from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import { login as loginApi } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginApi({ email, password });
      login(res.token);
      router.push('/invoices');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.950"
      px={4}
      style={{
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124, 58, 237, 0.12), transparent)',
      }}
    >
      <Box w="full" maxW="400px">
        {/* Brand mark */}
        <Flex direction="column" align="center" mb={8}>
          <Text
            fontWeight="700"
            fontSize="2xl"
            letterSpacing="-0.04em"
            color="gray.50"
            lineHeight="1"
          >
            Vibe Billing
          </Text>
          <Text fontSize="sm" color="gray.500" mt={1}>
            AI-powered vendor invoice engine
          </Text>
        </Flex>

        {/* Card */}
        <Box
          bg="#13131f"
          border="1px solid"
          borderColor="#1e1e35"
          borderRadius="2xl"
          p={8}
        >
          <Text fontWeight="600" fontSize="lg" color="gray.100" mb={1} letterSpacing="-0.02em">
            Sign in
          </Text>
          <Text fontSize="sm" color="gray.500" mb={6}>
            Enter your credentials to access your account
          </Text>

          <form onSubmit={handleSubmit}>
            <Stack gap={4}>
              {error && (
                <Alert.Root status="error" borderRadius="lg">
                  <Alert.Indicator />
                  <Alert.Title fontSize="sm">{error}</Alert.Title>
                </Alert.Root>
              )}

              <Field.Root required>
                <Field.Label fontSize="sm" color="gray.400" mb={1.5} fontWeight="500">
                  Email address
                </Field.Label>
                <Box position="relative">
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.600" pointerEvents="none">
                    <Mail size={15} />
                  </Box>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    pl={9}
                    bg="#0c0c17"
                    border="1px solid"
                    borderColor="#1e1e35"
                    color="gray.100"
                    _placeholder={{ color: 'gray.700' }}
                    _focus={{ borderColor: 'violet.600', boxShadow: '0 0 0 1px #7c3aed' }}
                    _hover={{ borderColor: '#2a2a45' }}
                    borderRadius="lg"
                  />
                </Box>
              </Field.Root>

              <Field.Root required>
                <Field.Label fontSize="sm" color="gray.400" mb={1.5} fontWeight="500">
                  Password
                </Field.Label>
                <Box position="relative">
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.600" pointerEvents="none">
                    <Lock size={15} />
                  </Box>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    pl={9}
                    bg="#0c0c17"
                    border="1px solid"
                    borderColor="#1e1e35"
                    color="gray.100"
                    _placeholder={{ color: 'gray.700' }}
                    _focus={{ borderColor: 'violet.600', boxShadow: '0 0 0 1px #7c3aed' }}
                    _hover={{ borderColor: '#2a2a45' }}
                    borderRadius="lg"
                  />
                </Box>
              </Field.Root>

              <Button
                type="submit"
                w="full"
                loading={loading}
                loadingText="Signing in…"
                mt={2}
                h="42px"
                borderRadius="lg"
                fontWeight="600"
                fontSize="sm"
                bg="violet.600"
                color="white"
                _hover={{ bg: 'violet.700' }}
                _active={{ bg: 'violet.800' }}
              >
                Sign in
              </Button>
            </Stack>
          </form>
        </Box>
      </Box>
    </Box>
  );
}
