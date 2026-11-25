export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-[42%] flex-col justify-between bg-ink p-10 text-paper lg:flex">
        <span className="font-display text-2xl">MindLarp Chat</span>
        <div>
          <p className="font-display max-w-md text-4xl leading-snug">
            One quiet place for <em className="text-accent">all</em> of your models.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-60">
            Chats, projects, agent mode and skills — presentations, PDFs and documents, generated
            right in the conversation.
          </p>
        </div>
        <p className="text-xs opacity-40">Part of the MindLarp workspace</p>
      </aside>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
