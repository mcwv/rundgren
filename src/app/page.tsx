import SwarmApp from './SwarmApp';

export default function Home() {
  return (
    // The main container now defines the grid layout for the entire page.
    <div className="grid grid-rows-[1fr] lg:grid-cols-[1fr_minmax(384px,auto)] min-h-screen">
      <SwarmApp />
    </div>
  );
}
