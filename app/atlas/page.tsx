import { PageShell } from "@/components/Chrome";

export default function AtlasPage() {
  return <PageShell title="Atlas"><div className="max-w-2xl">
    <p className="font-body text-xl italic text-wine/75">Your assistant lives in the orb on the left, ready to help without covering your page.</p>
    <section className="glass-card mt-6 space-y-4 p-5 sm:p-7">
      <h2 className="font-display text-2xl text-wine">Assistant connection</h2>
      <p className="font-body text-lg text-wine/80">Atlas can connect to SmallThinker through your authenticated ngrok gateway. Atlas has no access PIN: anyone who can reach the site can use your laptop’s model.</p>
      <p className="font-body text-lg text-wine/80">When the gateway is not configured, Atlas can understand simple exact commands such as “open Life” and “add visit Kyoto to places”. Additions require your approval.</p>
    </section>
    <div className="mt-6 font-body text-lg text-wine/80"><h2 className="font-display text-xl">Using your voice</h2><p className="mt-2">Open the orb, enable wake listening, then say “Atlas” followed by a command. You can also type commands.</p><p className="mt-2">Wake listening requires a supported browser, microphone permission and an open tab. Speech recognition may be processed by your browser’s speech provider; it is not a system-wide wake word.</p></div>
  </div></PageShell>;
}
