import { useMutation } from "@tanstack/react-query";

export function useSendXapi() {
    return useMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutationFn: async (statement: any) => {
            const res = await fetch("/api/xapi", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(statement),
            });

            if (!res.ok) {
                throw new Error("Failed to send xAPI statement");
            }

            return res.json();
        },
    });
}