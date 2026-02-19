import NextAuth from "next-auth"

const handler = NextAuth({
  // Add your authentication configuration here
  // For example, you can configure providers like Google, Facebook, etc.
  // See https://next-auth.js.org/providers for more information
  // For now, we'll leave it empty
  providers: []
})

export { handler as GET, handler as POST }