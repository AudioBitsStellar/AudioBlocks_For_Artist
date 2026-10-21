export default function ListenerAnalyticsUnavailable({ title }: { title: string }) {
  return (
    <section className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 mb-8">
      <h2 className="text-white text-lg font-semibold mb-2">{title}</h2>
      <p className="text-gray-400 text-sm">
        Listener location and demographics aren&apos;t available yet.
      </p>
    </section>
  );
}
