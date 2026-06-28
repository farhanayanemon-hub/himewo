import {
  db,
  pool,
  profilesTable,
  postsTable,
  postMediaTable,
  postReactionsTable,
  commentsTable,
  commentReactionsTable,
  sharesTable,
  friendRequestsTable,
  friendshipsTable,
  followsTable,
  conversationsTable,
  conversationMembersTable,
  messagesTable,
  messageAttachmentsTable,
  messageReactionsTable,
  presenceTable,
  groupsTable,
  groupMembersTable,
  pagesTable,
  pageFollowersTable,
  storiesTable,
  storyViewsTable,
  reelsTable,
  reelLikesTable,
  reelCommentsTable,
  notificationsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const avatar = (seed: string) =>
  `https://i.pravatar.cc/300?u=${encodeURIComponent(seed)}`;
const cover = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-cover/1200/400`;
const photo = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/900/700`;

// Today's month-day in Asia/Dhaka so a couple of seeded friends always have a
// birthday "today" right after seeding (makes the Birthdays card demoable).
const todayMmDd = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  month: "2-digit",
  day: "2-digit",
})
  .format(new Date())
  .slice(-5);
const todayBirthday = `1998-${todayMmDd}`;

const users = [
  { id: uid(1), username: "ahnaf", displayName: "Ahnaf Karim", bio: "Cricket pagol. Dhaka te thaki.", work: "Software Engineer", location: "Dhaka", isVerified: true, birthday: "1996-03-14" },
  { id: uid(2), username: "mim", displayName: "Mim Tabassum", bio: "Chobi tuli, gaan shuni 🎵", work: "Photographer", location: "Chittagong", isVerified: true, birthday: todayBirthday },
  { id: uid(3), username: "rifat", displayName: "Rifat Hasan", bio: "Foodie + gamer. Biryani > everything.", work: "Student", location: "Sylhet", isVerified: false, birthday: todayBirthday },
  { id: uid(4), username: "tania", displayName: "Tania Akter", bio: "Travel kori, golpo likhi.", work: "Content Creator", location: "Khulna", isVerified: false, birthday: "2000-07-22" },
  { id: uid(5), username: "shuvo", displayName: "Shuvo Ahmed", bio: "Football + coding. Barca fan.", work: "Frontend Dev", location: "Dhaka", isVerified: false, birthday: "1999-11-05" },
  { id: uid(6), username: "nusrat", displayName: "Nusrat Jahan", bio: "Doctor. Cha chara chole na ☕", work: "Doctor", location: "Rajshahi", isVerified: true, birthday: "1995-01-30" },
  { id: uid(7), username: "tanvir", displayName: "Tanvir Islam", bio: "Startup life. Building cool things.", work: "Founder", location: "Dhaka", isVerified: false, birthday: "1994-09-18" },
  { id: uid(8), username: "shara", displayName: "Shara Rahman", bio: "Artist 🎨 + cat lover 🐱", work: "Designer", location: "Comilla", isVerified: false, birthday: "2001-12-25" },
];

async function main() {
  console.log("Clearing existing data...");
  await db.execute(sql`TRUNCATE TABLE profiles RESTART IDENTITY CASCADE`);

  console.log("Seeding profiles...");
  await db.insert(profilesTable).values(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: `${u.username}@himewo.app`,
      avatarUrl: avatar(u.username),
      coverUrl: cover(u.username),
      bio: u.bio,
      birthday: u.birthday,
      work: u.work,
      location: u.location,
      isVerified: u.isVerified,
    })),
  );

  // Presence
  await db.insert(presenceTable).values(
    users.map((u, i) => ({
      userId: u.id,
      status: (i % 3 === 0 ? "online" : i % 3 === 1 ? "away" : "offline") as
        | "online"
        | "away"
        | "offline",
    })),
  );

  // Friendships (canonical pair: smaller id first; uid() already sorted)
  console.log("Seeding friendships & follows...");
  const friendPairs: Array<[number, number]> = [
    [1, 2], [1, 3], [1, 5], [2, 4], [2, 6], [3, 5], [3, 7], [4, 8], [5, 7], [6, 8],
  ];
  await db.insert(friendshipsTable).values(
    friendPairs.map(([a, b]) => ({ userAId: uid(a), userBId: uid(b) })),
  );
  await db.insert(friendRequestsTable).values([
    { requesterId: uid(7), addresseeId: uid(1), status: "pending" },
    { requesterId: uid(8), addresseeId: uid(1), status: "pending" },
    { requesterId: uid(6), addresseeId: uid(3), status: "pending" },
  ]);
  await db.insert(followsTable).values([
    { followerId: uid(3), followingId: uid(1) },
    { followerId: uid(4), followingId: uid(1) },
    { followerId: uid(5), followingId: uid(2) },
    { followerId: uid(8), followingId: uid(2) },
    { followerId: uid(1), followingId: uid(6) },
  ]);

  // Posts
  console.log("Seeding posts...");
  const postSeed = [
    { author: 1, content: "Aaj er match ta osthir chilo! Bangladesh jitse 🇧🇩🔥 Keu dekhso?", media: ["match"] },
    { author: 2, content: "Notun photoshoot. Ki obostha? 📸", media: ["shoot1", "shoot2"] },
    { author: 3, content: "Biryani khaite ke ke jabe aaj rate? 🍛", media: [] },
    { author: 5, content: "Notun React project shuru korlam. Excited! 💻", media: ["code"] },
    { author: 4, content: "Sajek valley theke ghure aslam. Joss jayga! 🏞️", media: ["sajek"] },
    { author: 6, content: "Cha + bristi = perfect bikel ☕🌧️", media: [] },
    { author: 7, content: "HiMewo te ekhon onek manush! Dhonnobad sobaike ❤️", media: [] },
    { author: 8, content: "Notun ekta painting korlam. Mota mota kemon laglo? 🎨", media: ["art"] },
  ];
  const postRows = await db
    .insert(postsTable)
    .values(
      postSeed.map((p) => ({
        authorId: uid(p.author),
        content: p.content,
        privacy: "public" as const,
      })),
    )
    .returning();

  // Post media
  const mediaValues = postSeed.flatMap((p, idx) =>
    p.media.map((m, pos) => ({
      postId: postRows[idx].id,
      url: photo(m),
      type: "image" as const,
      position: pos,
    })),
  );
  if (mediaValues.length > 0)
    await db.insert(postMediaTable).values(mediaValues);

  // Reactions
  console.log("Seeding reactions, comments, shares...");
  const reactionTypes = ["like", "love", "care", "haha", "wow", "sad", "angry"] as const;
  const reactionValues = postRows.flatMap((post, idx) =>
    users
      .filter((_, ui) => (ui + idx) % 2 === 0)
      .map((u, ri) => ({
        postId: post.id,
        userId: u.id,
        type: reactionTypes[(ri + idx) % reactionTypes.length],
      })),
  );
  await db.insert(postReactionsTable).values(reactionValues);

  // Comments
  const commentRows = await db
    .insert(commentsTable)
    .values([
      { postId: postRows[0].id, authorId: uid(3), content: "Osthir match chilo vai! 🔥" },
      { postId: postRows[0].id, authorId: uid(5), content: "Last over e tension hoye gesilo 😅" },
      { postId: postRows[1].id, authorId: uid(4), content: "Darun hoise chobi gula! 😍" },
      { postId: postRows[2].id, authorId: uid(1), content: "Ami achi! Kothay jabi?" },
      { postId: postRows[4].id, authorId: uid(2), content: "Wow Sajek! Amio jete chai 🏞️" },
      { postId: postRows[7].id, authorId: uid(6), content: "Tomar art always sera 🎨" },
    ])
    .returning();
  await db.insert(commentsTable).values([
    { postId: postRows[2].id, authorId: uid(3), parentId: commentRows[3].id, content: "Star Kabab, raat 9 ta!" },
  ]);
  await db.insert(commentReactionsTable).values([
    { commentId: commentRows[0].id, userId: uid(1), type: "love" },
    { commentId: commentRows[2].id, userId: uid(2), type: "like" },
    { commentId: commentRows[5].id, userId: uid(8), type: "love" },
  ]);
  await db.insert(sharesTable).values([
    { postId: postRows[0].id, userId: uid(4), caption: "Ei match ta miss korar moto na!" },
    { postId: postRows[6].id, userId: uid(2), caption: null },
  ]);

  // Conversations
  console.log("Seeding conversations & messages...");
  const [directConv] = await db
    .insert(conversationsTable)
    .values({ type: "direct", createdBy: uid(1) })
    .returning();
  const [groupConv] = await db
    .insert(conversationsTable)
    .values({ type: "group", title: "Cricket Lover BD 🏏", createdBy: uid(1) })
    .returning();
  await db.insert(conversationMembersTable).values([
    { conversationId: directConv.id, userId: uid(1), role: "member" },
    { conversationId: directConv.id, userId: uid(2), role: "member" },
    { conversationId: groupConv.id, userId: uid(1), role: "admin" },
    { conversationId: groupConv.id, userId: uid(3), role: "member" },
    { conversationId: groupConv.id, userId: uid(5), role: "member" },
  ]);
  const directMsgs = await db
    .insert(messagesTable)
    .values([
      { conversationId: directConv.id, senderId: uid(1), content: "Mim, kemon acho?" },
      { conversationId: directConv.id, senderId: uid(2), content: "Ei to bhalo! Tumi bolo 😊" },
      { conversationId: directConv.id, senderId: uid(1), content: "Aaj er photoshoot er chobi gula joss hoise!" },
      { conversationId: directConv.id, senderId: uid(2), content: "Thanks! 🥰 Aro ache, pore pathai." },
    ])
    .returning();
  const groupMsgs = await db
    .insert(messagesTable)
    .values([
      { conversationId: groupConv.id, senderId: uid(1), content: "Aaj match dekhte ke ke asbe?" },
      { conversationId: groupConv.id, senderId: uid(3), content: "Ami asbo! Snacks ante hobe 🍿" },
      { conversationId: groupConv.id, senderId: uid(5), content: "Count me in 🔥" },
    ])
    .returning();
  await db.insert(messageReactionsTable).values([
    { messageId: directMsgs[2].id, userId: uid(2), emoji: "❤️" },
    { messageId: groupMsgs[1].id, userId: uid(1), emoji: "😂" },
    { messageId: groupMsgs[2].id, userId: uid(3), emoji: "👍" },
  ]);
  await db.insert(messageAttachmentsTable).values([
    {
      messageId: directMsgs[2].id,
      url: photo("shoot-attach"),
      type: "image",
      name: "shoot.jpg",
    },
  ]);
  // Update conversation lastMessageAt + members' lastRead
  await db
    .update(conversationsTable)
    .set({ lastMessageAt: new Date() })
    .where(sql`true`);

  // Groups & Pages
  console.log("Seeding groups & pages...");
  const groupRows = await db
    .insert(groupsTable)
    .values([
      { name: "Dhaka Foodies 🍴", description: "Best khabar er adda", privacy: "public", createdBy: uid(3), avatarUrl: avatar("foodies"), coverUrl: cover("foodies") },
      { name: "BD Developers 👨‍💻", description: "Code, career, chakri", privacy: "public", createdBy: uid(5), avatarUrl: avatar("devs"), coverUrl: cover("devs") },
      { name: "Travelers of Bangladesh ✈️", description: "Ghurte valobashi", privacy: "private", createdBy: uid(4), avatarUrl: avatar("travel"), coverUrl: cover("travel") },
    ])
    .returning();
  await db.insert(groupMembersTable).values([
    { groupId: groupRows[0].id, userId: uid(3), role: "admin" },
    { groupId: groupRows[0].id, userId: uid(1), role: "member" },
    { groupId: groupRows[0].id, userId: uid(6), role: "member" },
    { groupId: groupRows[1].id, userId: uid(5), role: "admin" },
    { groupId: groupRows[1].id, userId: uid(7), role: "member" },
    { groupId: groupRows[2].id, userId: uid(4), role: "admin" },
    { groupId: groupRows[2].id, userId: uid(2), role: "member" },
  ]);
  // A couple of group posts
  await db.insert(postsTable).values([
    { authorId: uid(1), content: "Star Kabab er notun branch khulse! Keu try korso?", privacy: "public", groupId: groupRows[0].id },
    { authorId: uid(7), content: "React vs Vue — tomader opinion ki? 🤔", privacy: "public", groupId: groupRows[1].id },
  ]);

  const pageRows = await db
    .insert(pagesTable)
    .values([
      { name: "HiMewo Official", category: "Technology", description: "Bangladesh er nijossho social platform 💙", createdBy: uid(7), avatarUrl: avatar("himewo"), coverUrl: cover("himewo") },
      { name: "Cox's Bazar Tourism", category: "Travel", description: "Prithibir sobcheye boro samudra soikot", createdBy: uid(4), avatarUrl: avatar("coxs"), coverUrl: cover("coxs") },
    ])
    .returning();
  await db.insert(pageFollowersTable).values([
    { pageId: pageRows[0].id, userId: uid(1) },
    { pageId: pageRows[0].id, userId: uid(2) },
    { pageId: pageRows[0].id, userId: uid(3) },
    { pageId: pageRows[1].id, userId: uid(4) },
    { pageId: pageRows[1].id, userId: uid(5) },
  ]);

  // Stories (expire in 24h)
  console.log("Seeding stories & reels...");
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const storyRows = await db
    .insert(storiesTable)
    .values([
      { authorId: uid(1), mediaUrl: photo("story1"), mediaType: "image", caption: "Match day! 🏏", expiresAt: future },
      { authorId: uid(2), mediaUrl: photo("story2"), mediaType: "image", caption: "Behind the scenes 📸", expiresAt: future },
      { authorId: uid(4), mediaUrl: photo("story3"), mediaType: "image", caption: "Sajek sunrise 🌄", expiresAt: future },
    ])
    .returning();
  await db.insert(storyViewsTable).values([
    { storyId: storyRows[0].id, viewerId: uid(2) },
    { storyId: storyRows[0].id, viewerId: uid(3) },
    { storyId: storyRows[1].id, viewerId: uid(1) },
  ]);

  const reelRows = await db
    .insert(reelsTable)
    .values([
      { authorId: uid(2), videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", thumbnailUrl: photo("reel1"), caption: "Photoshoot timelapse 🎬" },
      { authorId: uid(3), videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", thumbnailUrl: photo("reel2"), caption: "Biryani banano 🍛🔥" },
      { authorId: uid(8), videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", thumbnailUrl: photo("reel3"), caption: "Speed painting 🎨" },
    ])
    .returning();
  await db.insert(reelLikesTable).values([
    { reelId: reelRows[0].id, userId: uid(1) },
    { reelId: reelRows[0].id, userId: uid(5) },
    { reelId: reelRows[1].id, userId: uid(3) },
    { reelId: reelRows[2].id, userId: uid(6) },
  ]);
  await db.insert(reelCommentsTable).values([
    { reelId: reelRows[0].id, authorId: uid(5), content: "Joss edit! 🔥" },
    { reelId: reelRows[1].id, authorId: uid(1), content: "Khide lege gelo 😋" },
  ]);

  // Notifications for user 1 (the default dev login)
  console.log("Seeding notifications...");
  await db.insert(notificationsTable).values([
    { userId: uid(1), actorId: uid(3), type: "reaction", entityType: "post", entityId: postRows[0].id, isRead: false },
    { userId: uid(1), actorId: uid(5), type: "comment", entityType: "post", entityId: postRows[0].id, isRead: false },
    { userId: uid(1), actorId: uid(7), type: "friend_request", entityType: "friend_request", isRead: false },
    { userId: uid(1), actorId: uid(4), type: "follow", entityType: "user", isRead: true },
    { userId: uid(1), actorId: uid(2), type: "message", entityType: "conversation", entityId: directConv.id, isRead: false },
  ]);

  console.log("\n✅ Seed complete!");
  console.log("\nDev login (no Supabase needed): send header  x-dev-user-id: <uuid>");
  console.log(`Primary dev user (Ahnaf): ${uid(1)}`);
  console.log("All users:");
  for (const u of users) console.log(`  ${u.displayName.padEnd(18)} ${u.id}  @${u.username}`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await pool.end();
    process.exit(1);
  });
