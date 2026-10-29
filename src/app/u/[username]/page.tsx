import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function UserRedirectPage({ params }: PageProps) {
  const resolved = await params;
  const username = resolved.username;
  redirect(`/${username}`);
}
