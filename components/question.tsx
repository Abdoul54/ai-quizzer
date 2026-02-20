import { CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "./ui/card";
import { Item, ItemContent, ItemMedia } from "./ui/item";

const Question = ({ question }: {
    question: {
        id: string;
        questionText: string;
        questionType: "true_false" | "single_choice" | "multiple_choice";
        options: {
            id: string;
            optionText: string;
            isCorrect: boolean;
        }[];
    }
}) => {

    return (
        <Card className="w-full">
            <CardContent>
                <CardTitle>{question?.questionText}</CardTitle>
                <CardDescription>
                    {question?.questionType === "true_false" && "True/False"}
                    {question?.questionType === "single_choice" && "Single choice"}
                    {question?.questionType === "multiple_choice" && "Multiple choice"}
                </CardDescription>
                <div className="flex flex-col gap-2 mt-4">
                    {question?.options.map((o) => {
                        return (
                            <Item
                                key={o?.optionText}
                                variant="outline"
                            >
                                <ItemContent>{o?.optionText}</ItemContent>
                                {
                                    o?.isCorrect && (
                                        <ItemMedia>
                                            <CheckCircle className="w-4 h-4 text-success" />
                                        </ItemMedia>
                                    )
                                }
                            </Item>
                        )
                    })}
                </div>
            </CardContent>
        </Card>);
}

export default Question;