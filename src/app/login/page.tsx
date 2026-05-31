'use client';
import { useState } from 'react';
import {
  Box, Button, Input, Stack, Heading, Text, Card, Field, Alert,
} from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import { login as loginApi } from '@/services/auth';
import { useRouter } from 'next/navigation';

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
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.950">
      <Card.Root w="full" maxW="md" boxShadow="lg" bg="gray.800">
        <Card.Header>
          <Heading textAlign="center" color="blue.400">Vibe Billing</Heading>
          <Text textAlign="center" color="gray.400" mt={2}>Sign in to your account</Text>
        </Card.Header>
        <Card.Body>
          <form onSubmit={handleSubmit}>
            <Stack gap={4}>
              {error && <Alert.Root status="error"><Alert.Indicator /><Alert.Title>{error}</Alert.Title></Alert.Root>}
              <Field.Root required>
                <Field.Label>Email</Field.Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </Field.Root>
              <Field.Root required>
                <Field.Label>Password</Field.Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
              </Field.Root>
              <Button type="submit" colorScheme="blue" loading={loading} w="full">Sign In</Button>
            </Stack>
          </form>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
