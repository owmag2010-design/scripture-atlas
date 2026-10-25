// Premium Kids story: Jesus calms the storm (Mark 4:35–41). One script drives the animation, voices, subtitles,
// read-along and quiz. Every line is tagged:
//   scripture  — words of the Bible (World English Bible, public domain), quoted exactly, with reference
//   retold     — a plain retelling of what a passage says, with reference
//   background — setting facts from outside the Bible (geography, archaeology), with where to read more
//   imagined   — not in the Bible: a detail, a gesture, who says a line
//   thought    — an application or reflection for families; not a claim about the text
// Status: DRAFT, awaiting theological review (see review below).

export const STORY = {
  id: "storm",
  title: "Jesus calms the storm",
  passages: ["Mark.4.35-4.41"],
  parallels: ["Matt.8.23-8.27", "Luke.8.22-8.25"],
  translation: "World English Bible",
  review: { status: "draft", by: "", date: "" },
  colour: "#1E6FA8",
  // Cast: puppet settings for the shared rig (kids-engine/puppet.js) and a voice for each speaking part.
  cast: {
    narrator: { name: "Narrator", voice: 1198 },
    jesus: { name: "Jesus", voice: 1138, rig: { skin: "#B07A4F", hair: "#2A1C12", beard: "short", robe: "#E9E0CC", sash: "#8C5A2B", cloth: null, height: 1 } },
    peter: { name: "Peter", voice: 1187, rig: { skin: "#9A6643", hair: "#1E1510", beard: "full", robe: "#6E7F8F", sash: "#3E4A55", cloth: "#C9B48A", height: 1.04 } },
    john: { name: "John", voice: 1385, rig: { skin: "#B88358", hair: "#2B1A10", beard: "none", robe: "#B65C3A", sash: "#6B3420", cloth: null, height: 0.94 } },
    andrew: { name: "Andrew", rig: { skin: "#8F5E3C", hair: "#20160F", beard: "short", robe: "#7A8F5A", sash: "#46562F", cloth: "#D8C7A0", height: 1 } },
    james: { name: "James", rig: { skin: "#A8734B", hair: "#2A1C12", beard: "full", robe: "#8B6B9A", sash: "#4E3A5A", cloth: null, height: 1.02 } }
  },
  // Scenes are shared by every age version; lines say which scene they play in.
  scenes: {
    shore: { sky: "sunset", water: 0.05, crowd: true, boats: 2, camera: "wide" },
    sail: { sky: "dusk", water: 0.12, boats: 3, camera: "follow" },
    sleep: { sky: "night", water: 0.15, boats: 2, camera: "stern", stars: true },
    storm: { sky: "storm", water: 1, rain: true, lightning: true, boats: 0, camera: "shake" },
    wake: { sky: "storm", water: 0.95, rain: true, lightning: true, camera: "close" },
    calm: { sky: "clearing", water: 0.02, moon: true, camera: "rise" },
    wonder: { sky: "moon", water: 0.02, moon: true, stars: true, camera: "close" },
    end: { sky: "moon", water: 0.03, moon: true, stars: true, camera: "away" }
  },
  versions: {
    "3-5": [
      { scene: "shore", who: "narrator", kind: "retold", ref: "Mark.4.35-4.36", text: "One evening, Jesus and his friends got into a boat to sail across the big lake.", act: { jesus: "wave", peter: "row" } },
      { scene: "shore", who: "jesus", kind: "scripture", ref: "Mark.4.35", text: "Let’s go over to the other side.", act: { jesus: "point" } },
      { scene: "sleep", who: "narrator", kind: "retold", ref: "Mark.4.38", text: "Jesus lay down on a cushion at the back of the boat, and fell fast asleep.", act: { jesus: "sleep" } },
      { scene: "storm", who: "narrator", kind: "retold", ref: "Mark.4.37", tags: "[excited]", text: "Then the wind began to blow. Whoosh! The waves grew bigger and bigger, and water splashed into the boat!", act: { peter: "bail", john: "cling", andrew: "cling", jesus: "sleep" }, sfx: ["thunder"] },
      { scene: "wake", who: "narrator", kind: "retold", ref: "Mark.4.38", text: "His friends were frightened. They woke Jesus up.", act: { peter: "shake", jesus: "wake" } },
      { scene: "wake", who: "peter", kind: "scripture", ref: "Mark.4.38", note: "Mark says “they” woke him; here Peter speaks for them.", tags: "[afraid]", text: "Teacher, don’t you care that we are dying?", act: { peter: "plead" } },
      { scene: "wake", who: "narrator", kind: "retold", ref: "Mark.4.39", text: "Jesus stood up, and he spoke to the wind and the waves.", act: { jesus: "stand" } },
      { scene: "wake", who: "jesus", kind: "scripture", ref: "Mark.4.39", tags: "[firmly]", text: "Peace! Be still!", act: { jesus: "calm" }, interact: { kind: "tap", prompt: "Tap the waves to see what happened" } },
      { scene: "calm", who: "narrator", kind: "retold", ref: "Mark.4.39", tags: "[softly]", text: "And the wind stopped. The waves lay down. Everything was calm and quiet.", act: { jesus: "idle", peter: "amazed", john: "amazed" } },
      { scene: "wonder", who: "john", kind: "scripture", ref: "Mark.4.41", note: "Mark says they said it “to one another”; here John speaks.", tags: "[in awe]", text: "Who then is this, that even the wind and the sea obey him?", act: { john: "amazed", peter: "amazed" } },
      { scene: "end", who: "narrator", kind: "thought", text: "Even the wind and the waves obeyed Jesus. When we feel scared, we can talk to him too.", act: { jesus: "idle" } }
    ],
    "6-9": [
      { scene: "shore", who: "narrator", kind: "retold", ref: "Mark.4.1", text: "All day long, Jesus had been teaching a huge crowd beside the Sea of Galilee. So many people came that he sat in a boat, just off the shore, to speak to them.", act: { jesus: "teach" } },
      { scene: "shore", who: "narrator", kind: "retold", ref: "Mark.4.35", text: "When evening came, Jesus turned to his disciples.", act: { jesus: "turn" } },
      { scene: "shore", who: "jesus", kind: "scripture", ref: "Mark.4.35", text: "Let’s go over to the other side.", act: { jesus: "point" } },
      { scene: "sail", who: "narrator", kind: "retold", ref: "Mark.4.36", text: "So they left the crowd behind and set off, with Jesus in the boat just as he was. Other small boats sailed with them.", act: { peter: "row", andrew: "row", james: "sail" } },
      { scene: "sail", who: "narrator", kind: "retold", ref: "Mark.1.16-1.20", text: "Peter, Andrew, James and John had been fishermen on this lake. They knew how to handle a boat.", act: { peter: "row", andrew: "row" } },
      { scene: "sleep", who: "narrator", kind: "retold", ref: "Mark.4.38", text: "At the back of the boat, Jesus lay down on a cushion, and fell asleep.", act: { jesus: "sleep" } },
      { scene: "storm", who: "narrator", kind: "retold", ref: "Mark.4.37", tags: "[tense]", text: "Suddenly a great windstorm swept across the water. Waves crashed over the sides, and the boat began to fill.", act: { peter: "bail", andrew: "bail", john: "cling", james: "cling", jesus: "sleep" }, sfx: ["thunder"] },
      { scene: "storm", who: "narrator", kind: "imagined", text: "Even the fishermen held on tight. Lightning lit up the sky.", act: { john: "cling", james: "cling" }, sfx: ["thunder"], interact: { kind: "choice", prompt: "If you were in the boat, what would you do?", options: ["Hold on tight", "Bail out the water", "Wake Jesus"], reply: "Let’s see what the disciples did." } },
      { scene: "wake", who: "narrator", kind: "retold", ref: "Mark.4.38", text: "And Jesus was still asleep! They woke him up and said:", act: { peter: "shake", jesus: "wake" } },
      { scene: "wake", who: "peter", kind: "scripture", ref: "Mark.4.38", note: "Mark says “they” said this; here Peter speaks for them.", tags: "[shouting]", text: "Teacher, don’t you care that we are dying?", act: { peter: "plead" } },
      { scene: "wake", who: "narrator", kind: "retold", ref: "Mark.4.39", text: "Jesus got up. He told the wind to stop, and he said to the sea:", act: { jesus: "stand" } },
      { scene: "wake", who: "jesus", kind: "scripture", ref: "Mark.4.39", tags: "[firmly]", text: "Peace! Be still!", act: { jesus: "calm" }, interact: { kind: "tap", prompt: "Tap the waves after Jesus speaks" } },
      { scene: "calm", who: "narrator", kind: "scripture", ref: "Mark.4.39", tags: "[softly]", text: "The wind ceased, and there was a great calm.", act: { jesus: "idle", peter: "amazed", john: "amazed", andrew: "amazed", james: "amazed" } },
      { scene: "calm", who: "jesus", kind: "scripture", ref: "Mark.4.40", tags: "[gently]", text: "Why are you so afraid? How is it that you have no faith?", act: { jesus: "ask" } },
      { scene: "wonder", who: "narrator", kind: "retold", ref: "Mark.4.41", text: "The disciples were filled with awe. They whispered to each other:", act: { peter: "amazed", john: "amazed" } },
      { scene: "wonder", who: "john", kind: "scripture", ref: "Mark.4.41", note: "Mark says they said it “to one another”; here John speaks.", tags: "[whispers]", text: "Who then is this, that even the wind and the sea obey him?", act: { john: "amazed" } },
      { scene: "end", who: "narrator", kind: "thought", text: "The disciples had seen something only God can do. When storms come in our lives, Jesus is with us in the boat.", act: { jesus: "idle" } }
    ],
    "10-13": [
      { scene: "shore", who: "narrator", kind: "background", source: "galilee-boat", text: "The Sea of Galilee is a freshwater lake in northern Israel, set low among hills. Fishermen worked it in wooden boats; one from about the time of Jesus was found in the mud of its shore in 1986.", act: { peter: "row" } },
      { scene: "shore", who: "narrator", kind: "retold", ref: "Mark.4.1-4.2", text: "Jesus had spent the day teaching from a boat, because the crowd on the shore was so large. Mark records that he taught them in parables.", act: { jesus: "teach" } },
      { scene: "shore", who: "jesus", kind: "scripture", ref: "Mark.4.35", text: "Let’s go over to the other side.", act: { jesus: "point" } },
      { scene: "sail", who: "narrator", kind: "scripture", ref: "Mark.4.36", text: "Leaving the multitude, they took him with them, even as he was, in the boat. Other small boats were also with him.", act: { peter: "row", andrew: "row", james: "sail" } },
      { scene: "sail", who: "narrator", kind: "retold", ref: "Mark.1.16-1.20", text: "At least four of the disciples were fishermen who knew these waters well: Simon Peter and his brother Andrew, and James and John, the sons of Zebedee.", act: { peter: "row", andrew: "row" } },
      { scene: "sleep", who: "narrator", kind: "scripture", ref: "Mark.4.38", text: "He himself was in the stern, asleep on the cushion.", act: { jesus: "sleep" } },
      { scene: "storm", who: "narrator", kind: "scripture", ref: "Mark.4.37", tags: "[tense]", text: "A big wind storm arose, and the waves beat into the boat, so much that the boat was already filled.", act: { peter: "bail", andrew: "bail", john: "cling", james: "cling", jesus: "sleep" }, sfx: ["thunder"] },
      { scene: "storm", who: "narrator", kind: "imagined", text: "Experienced fishermen were bailing as fast as they could, and losing.", act: { peter: "bail", andrew: "bail" }, sfx: ["thunder"], interact: { kind: "choice", prompt: "Why do you think Jesus could sleep through this?", options: ["He was exhausted", "He trusted his Father", "Both"], reply: "Mark doesn’t say. Many readers think both are true." } },
      { scene: "wake", who: "narrator", kind: "retold", ref: "Mark.4.38", text: "They woke him up and said to him:", act: { peter: "shake", jesus: "wake" } },
      { scene: "wake", who: "peter", kind: "scripture", ref: "Mark.4.38", note: "Mark says “they” said this; here Peter speaks for them.", tags: "[shouting]", text: "Teacher, don’t you care that we are dying?", act: { peter: "plead" } },
      { scene: "wake", who: "narrator", kind: "scripture", ref: "Mark.4.39", text: "He awoke, and rebuked the wind, and said to the sea:", act: { jesus: "stand" } },
      { scene: "wake", who: "jesus", kind: "scripture", ref: "Mark.4.39", tags: "[firmly]", text: "Peace! Be still!", act: { jesus: "calm" } },
      { scene: "calm", who: "narrator", kind: "scripture", ref: "Mark.4.39", tags: "[softly]", text: "The wind ceased, and there was a great calm.", act: { jesus: "idle", peter: "amazed", john: "amazed", andrew: "amazed", james: "amazed" } },
      { scene: "calm", who: "jesus", kind: "scripture", ref: "Mark.4.40", tags: "[gently]", text: "Why are you so afraid? How is it that you have no faith?", act: { jesus: "ask" } },
      { scene: "wonder", who: "narrator", kind: "scripture", ref: "Mark.4.41", text: "They were greatly afraid, and said to one another:", act: { peter: "amazed", john: "amazed" } },
      { scene: "wonder", who: "john", kind: "scripture", ref: "Mark.4.41", note: "Mark says they said it “to one another”; here John speaks.", tags: "[whispers]", text: "Who then is this, that even the wind and the sea obey him?", act: { john: "amazed" } },
      { scene: "end", who: "narrator", kind: "thought", ref: "Ps.107.29", text: "Their question matters. The Psalms praise God as the one who calms the storm and stills the waves. Mark leaves his readers to answer it: who is Jesus?", act: { jesus: "idle" } }
    ]
  },
  quiz: [
    ["Where was Jesus when the storm came?", ["Asleep on a cushion", "Walking on the shore", "Fishing with a net"], 0, "Mark.4.38"],
    ["What did Jesus say to the sea?", ["Go away!", "Peace! Be still!", "Help us!"], 1, "Mark.4.39"],
    ["What happened after Jesus spoke?", ["It rained harder", "There was a great calm", "The boat sank"], 1, "Mark.4.39"],
    ["What question did the disciples ask?", ["Where are we going?", "Who then is this?", "Can we go home?"], 1, "Mark.4.41"]
  ],
  activity: { kind: "order", prompt: "Put the story in order", items: ["Jesus says, Let’s go over to the other side", "Jesus falls asleep on a cushion", "A great storm fills the boat", "The disciples wake Jesus", "Jesus says, Peace! Be still!", "There is a great calm"] },
  grownups: {
    talk: ["When do you feel afraid?", "What did the disciples do when they were scared?", "What does this story show about who Jesus is?"],
    notes: "Mark, Matthew and Luke all tell this story. Names given to the speakers, facial expressions, the number of disciples shown and every visual detail are imagined for the film and are marked so in read-along. Scripture quotations are from the World English Bible (public domain)."
  }
};
