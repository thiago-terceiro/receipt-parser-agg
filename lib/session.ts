import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";

export type SessionIdentity = {
    userId: string | null;
    email: string | null;
};

export const getSessionIdentity = async (): Promise<SessionIdentity | null> => {
    const session = await getServerSession(authOptions);
    const userId =
        (session?.user as { id?: string } | undefined)?.id?.trim() || null;
    const email = session?.user?.email?.trim().toLowerCase() || null;

    if (!userId && !email) {
        return null;
    }

    return {
        userId,
        email,
    };
};