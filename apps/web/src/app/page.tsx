import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Kairos</h1>
      <p>The application shell is being assembled from verified primitives.</p>
      <Link href="/system">Open the primitive showcase</Link>
    </main>
  );
}
