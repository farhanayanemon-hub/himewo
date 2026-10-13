import { Redirect } from "expo-router";

export default function ShopIndexRedirect() {
  return <Redirect href={"/(tabs)/shop" as never} />;
}
