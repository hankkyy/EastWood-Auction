import Link from "next/link";
import { Box, Button, Container, Text, Title } from "@mantine/core";
import { Wrapper } from "@/layout";
import { SEO } from "@/components/SEO";

export default function Custom404() {
  return (
    <>
      <SEO
        title="Page Not Found"
        description="The page you are looking for does not exist or has been moved."
        noindex
      />
      <Wrapper>
        <Container py={120} size="sm">
          <Box sx={{ textAlign: "center" }}>
            <Title
              order={1}
              sx={(theme) => ({
                fontSize: 72,
                fontWeight: 200,
                fontFamily: '"Playfair Display", Georgia, serif',
                color: theme.colorScheme === "dark" ? "#c4a255" : "#7a6e56",
              })}
            >
              404
            </Title>
            <Title order={2} size="h3" mt="md">
              Page Not Found
            </Title>
            <Text color="dimmed" mt="md" mb="xl">
              The page you are looking for does not exist or has been moved.
            </Text>
            <Button
              component={Link}
              href="/"
              size="md"
              variant="filled"
              color="yellow"
              sx={{
                fontWeight: 600,
              }}
            >
              Back to Home
            </Button>
          </Box>
        </Container>
      </Wrapper>
    </>
  );
}
