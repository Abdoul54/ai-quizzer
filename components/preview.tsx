import { useLatestDraft } from "@/hooks/api/use-quiz";
import Question from "./question";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const Preview = ({ id }: { id: string }) => {
    const { data, isLoading, error } = useLatestDraft(id);
    const [currrentQuestion, setCurrentQuestion] = useState(0);
    const questions = data?.content?.questions || [];


    return (
        <div className="flex flex-col items-center  h-full">
            <div className="w-full flex justify-end">
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={currrentQuestion === 0 || questions.length === 0}
                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    >
                        <ChevronLeft />
                    </Button>
                    {questions.length > 0 && (
                        <span className="font-sans font-bold">
                            {currrentQuestion + 1}/{questions.length}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={currrentQuestion === questions.length - 1 || questions.length === 0}
                        onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                    >
                        <ChevronRight />
                    </Button>
                </div>
            </div>
            <div className="w-full flex justify-center items-center h-full ">
                {isLoading ? (
                    <div>Loading...</div>
                ) : error ? (
                    <div>Error loading preview: {error.message}</div>
                ) : questions.length === 0 ? (
                    <div>No questions available</div>
                ) : (
                    <Question question={questions[currrentQuestion]} />
                )}
            </div>
        </div>
    );
}

export default Preview;
