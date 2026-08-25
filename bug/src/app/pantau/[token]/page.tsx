import WatchClient from "./watch-client";

export default async function WatchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <WatchClient token={token} />;
}