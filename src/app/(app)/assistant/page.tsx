import ChatBox from "@/components/ChatBox";
import { PageTitle } from "@/components/ui";

export default function AssistantPage() {
  return (
    <>
      <PageTitle title="Explain-this-topic assistant" subtitle="Answers use only your uploaded material and cite where they came from. If your material doesn't cover it, the assistant says so." />
      <ChatBox />
    </>
  );
}
