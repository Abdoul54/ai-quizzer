import { LucideIcon } from "lucide-react";

type Props = {
    icon: LucideIcon;
    size?: number;
    className?: string;
};

export const GradientIcon = ({ icon: Icon, size = 16, className }: Props) => {
    return (
        <Icon
            size={size}
            className={className}
            style={{
                stroke: "url(#iconGradient)",
                strokeWidth: 2,
            }}
        />
    );
};