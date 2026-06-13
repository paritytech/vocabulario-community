const NO_TOPIC = 'No topic';

/** Neutral topic chip. Renders nothing for empty / "No topic". */
export default function TopicPill({ topic }) {
  if (!topic || topic === NO_TOPIC) return null;
  return <span className="pill pill-topic">{topic}</span>;
}
