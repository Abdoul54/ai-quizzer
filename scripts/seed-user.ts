import "dotenv/config";
import { auth } from "../lib/auth";

const DEFAULT_USER = {
    name: "Abdelwahed Akhechane",
    email: "abdelwahed.akhechane@gmail.com",
    password: "password",
};

async function seedUser() {
    const { name, email, password } = DEFAULT_USER;

    console.log(`Seeding user: ${email}`);

    const response = await auth.api.signUpEmail({
        body: { name, email, password },
    });

    if (!response?.user) {
        console.error("Failed to create user — the email may already exist.");
        process.exit(1);
    }

    console.log(`✓ User created: ${response.user.email} (id: ${response.user.id})`);
}

seedUser().catch((err) => {
    console.error(err);
    process.exit(1);
});