import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";

export type SessionIdentity = {
    userId: string | null;
    email: string | null;
    name: string | null;
    image: string | null;
};

export const getSessionIdentity = async (): Promise<SessionIdentity | null> => {
    const session = await getServerSession(authOptions);
    const userId =
        (session?.user as { id?: string } | undefined)?.id?.trim() || null;
    const email = session?.user?.email?.trim().toLowerCase() || null;
    const name = session?.user?.name?.trim() || null;
    const image = session?.user?.image?.trim() || null;

    if (!userId && !email) {
        return null;
    }

    return {
        userId,
        email,
        name,
        image,
    };
};