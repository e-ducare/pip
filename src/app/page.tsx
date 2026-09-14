import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function Page() {
  const supabase = createClient();

  // const { data: todos } = await supabase.from("todos").select();

  return (
    <p>
      Head over to the{" "}
      <Link
        href="auth/sign-up"
        className="font-bold hover:underline text-foreground/80"
      >
        Sign up
      </Link>{" "}
      page and sign up your first user. It&apos;s okay if this is just you
      for now. Your awesome idea will have plenty of users later!
    </p>
    // <ul>
    //   {todos?.map((todo) => (
    //     <li key={todo.id}>{todo.name}</li>
    //   ))}
    // </ul>
  );
}
