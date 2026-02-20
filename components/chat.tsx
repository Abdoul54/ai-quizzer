"use client";

import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageContent,
    MessageResponse,
} from "@/components/ai-elements/message";
import {
    PromptInput,
    PromptInputBody,
    PromptInputFooter,
    PromptInputProvider,
    PromptInputSubmit,
    PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { useChat } from "@ai-sdk/react";
import { MessageSquare } from "lucide-react";

const Chat = () => {
    const { messages, sendMessage, status } = useChat();

    const handleSubmit = ({ text }: { text?: string }) => {
        if (!text?.trim()) return;
        sendMessage({ text });
    };

    return (
        <div className="flex flex-col h-full">
            <Conversation className="flex-1 min-h-0">
                <ConversationContent>
                    {messages.length === 0 ? (
                        <ConversationEmptyState
                            icon={<MessageSquare className="size-8" />}
                            title="Start a conversation"
                            description="Type a message below to get started."
                        />
                    ) : (
                        messages.map((message) => (
                            <Message from={message.role} key={message.id}>

                                <MessageContent>
                                    {message.parts.map((part, i) => {
                                        if (part.type !== "text") return null;
                                        return (
                                            <MessageResponse key={`${message.id}-${i}`}>
                                                {part.text}
                                            </MessageResponse>
                                        );
                                    })}
                                </MessageContent>
                            </Message>
                        ))
                    )}
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>

            <div className="p-4">
                <PromptInputProvider>
                    <PromptInput onSubmit={handleSubmit}>
                        <PromptInputBody>
                            <PromptInputTextarea placeholder="Type a message…" />
                        </PromptInputBody>
                        <PromptInputFooter>
                            <PromptInputSubmit
                                status={status === "streaming" ? "streaming" : "ready"}
                            />
                        </PromptInputFooter>
                    </PromptInput>
                </PromptInputProvider>
            </div>
        </div>
    );
};

export default Chat;