import { Redirect } from "expo-router";
import { useAuth } from "@/auth";
import { IS_RIDER } from "@/config";
import { Loading } from "@/ui";

/** Entry: riders must sign in; customers can browse first and sign in at checkout. */
export default function Index() {
  const { ready, token } = useAuth();
  if (!ready) return <Loading />;
  if (IS_RIDER) return <Redirect href={token ? "/rider" : "/login"} />;
  return <Redirect href="/home" />;
}
