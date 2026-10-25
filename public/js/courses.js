// Learn: course content. Every course here is a DRAFT written with AI assistance and must be reviewed
// by a human editor before it is marked "reviewed". Readings are references only; the app shows the text
// from the Bible data, so nothing is retyped. Validated by test/courses.test.mjs.

export const STATUS = {
  draft: { label: "Draft · written with AI assistance, awaiting editorial review", short: "AI-assisted draft" },
  reviewed: { label: "Reviewed by the Ereunia editor", short: "Reviewed" }
};

export const COURSES = [
  {
    id: "foundations", title: "Bible foundations", level: "Beginner", status: "draft",
    summary: "What the Bible is, how it is organised, how to read a passage well, and how it reached us.",
    lessons: [
      {
        id: "what", title: "What the Bible is", minutes: 15,
        objectives: ["Describe the Bible as a library of books written over many centuries", "Name the three languages it was written in", "Explain why different Christian traditions have different book counts"],
        readings: ["Luke 1:1-4", "2 Timothy 3:14-17"],
        body: [
          "The Bible is a library rather than a single book. Protestant Bibles contain 66 books: 39 in the Old Testament and 27 in the New. They were written by many authors over more than a thousand years.",
          "The Old Testament was written mainly in Hebrew, with some chapters in Aramaic (for example Daniel 2:4 to 7:28 and parts of Ezra). The New Testament was written in Greek.",
          "Christian traditions differ on the Old Testament. Catholic Bibles include seven further books, such as Tobit and 1 and 2 Maccabees, for 73 in total, and Orthodox churches include several more. Jewish Bibles contain the same books as the Protestant Old Testament, counted and ordered differently.",
          "Luke opens his Gospel by explaining his method: he gathered eyewitness accounts and investigated carefully. That shows one way biblical authors worked: as writers using sources, as well as people who believed they spoke of God."
        ],
        family: "The Bible is like a library on one shelf: 66 small books with stories, songs, letters and wise sayings. Different people wrote them over a very long time, in Hebrew, Aramaic and Greek.",
        familyQuestions: ["What is your favourite kind of book? Can you find that kind of writing in the Bible?", "Why do you think Luke checked his facts carefully?"],
        questions: ["What difference does it make to read the Bible as a library of different kinds of writing?", "Luke says he investigated carefully. How does that shape the way you read his Gospel?"],
        quiz: [
          { q: "How many books are in a Protestant Bible?", options: ["39", "66", "73", "81"], answer: 1, explain: "39 in the Old Testament and 27 in the New. Catholic Bibles have 73." },
          { q: "Which three languages was the Bible first written in?", options: ["Hebrew, Greek and Latin", "Hebrew, Aramaic and Greek", "Aramaic, Latin and Greek", "Hebrew, Arabic and Greek"], answer: 1, explain: "Latin came later, in translations such as the Vulgate." },
          { q: "In Luke 1:1-4, what does Luke say he did before writing?", options: ["Received a vision", "Investigated everything carefully from the start", "Copied Matthew's Gospel", "Wrote down Paul's sermons"], answer: 1, explain: "He says he had perfect understanding of all things from the very first and wrote an orderly account.", ref: "Luke 1:3" }
        ]
      },
      {
        id: "shape", title: "How the Bible is organised", minutes: 15,
        objectives: ["Name the main sections of both testaments", "Compare the Christian Old Testament order with the Jewish Tanakh", "Use the sections to find your way around"],
        readings: ["Luke 24:44-45"],
        body: [
          "Christian Bibles group the Old Testament into Law (Genesis to Deuteronomy), History (Joshua to Esther), Wisdom and Poetry (Job to Song of Solomon) and Prophets (Isaiah to Malachi). The New Testament has the Gospels and Acts, the letters, and Revelation.",
          "The Jewish Bible, the Tanakh, has the same books in three parts: Torah (instruction), Nevi'im (Prophets) and Ketuvim (Writings). The name Tanakh is formed from the first letters T, N and K.",
          "Jesus speaks of the law of Moses, the prophets and the psalms in Luke 24:44, which matches this three-part shape, with the Psalms standing at the head of the Writings.",
          "In the reader, the book menu is grouped in these sections, and each book's Background tab shows which group it belongs to."
        ],
        family: "The Bible has two big parts. The Old Testament tells about God and Israel before Jesus. The New Testament tells about Jesus and the first Christians. Inside each part, books are grouped like shelves: stories, songs, prophets and letters.",
        familyQuestions: ["Which part of the Bible tells about Jesus' life?", "Can you find the book of Psalms, the Bible's songbook?"],
        questions: ["Why might the order of books matter for how they are read?", "What does Luke 24:44 suggest about how Jesus read Israel's Scriptures?"],
        quiz: [
          { q: "What are the three parts of the Jewish Tanakh?", options: ["Law, Gospels, Letters", "Torah, Prophets, Writings", "History, Wisdom, Apocalypse", "Torah, Talmud, Psalms"], answer: 1, explain: "Torah, Nevi'im and Ketuvim give the name TaNaK." },
          { q: "Which three groups does Jesus mention in Luke 24:44?", options: ["The law of Moses, the prophets and the psalms", "The kings, the priests and the prophets", "Genesis, Isaiah and Daniel", "The scribes, the elders and the Pharisees"], answer: 0, explain: "The psalms head the third section, the Writings.", ref: "Luke 24:44" },
          { q: "Which books make up the Law, also called the Pentateuch?", options: ["Genesis to Deuteronomy", "Genesis to Joshua", "Exodus to Judges", "Job to Song of Solomon"], answer: 0, explain: "The five books traditionally linked with Moses." }
        ]
      },
      {
        id: "reading", title: "Reading a passage well", minutes: 20,
        objectives: ["Use observation, interpretation and application", "Notice genre and context", "Practise on a psalm and a parable"],
        readings: ["Psalm 1", "Matthew 7:24-27"],
        body: [
          "Observation asks what the text says: who is speaking, to whom, what happens, which words repeat. Interpretation asks what it meant for its first hearers. Application asks what it asks of us now. Skipping the first two steps is the most common mistake.",
          "Genre matters. Psalm 1 is poetry: it works through images such as a tree planted by rivers and chaff blown by wind. Matthew 7:24-27 is a parable: a short story with a single main point about hearing and doing.",
          "Context matters too. Matthew 7:24-27 closes the Sermon on the Mount, so 'these sayings' means the teaching of Matthew 5 to 7.",
          "Use the reader's study margin as you practise: the Background tab for setting, the Hebrew or Greek tab for key words, and Refs for related passages."
        ],
        family: "When we read the Bible we can ask three questions. What does it say? What did it mean to the people who first heard it? What does it mean for me today?",
        familyQuestions: ["In Psalm 1, what is the good person like? A tree or chaff?", "In Jesus' story, why did one house stand and the other fall?"],
        questions: ["What picture does Psalm 1 use for a person who delights in God's law, and why might that picture fit?", "What is the single main point of the two builders, read as the ending of the Sermon on the Mount?"],
        quiz: [
          { q: "In Psalm 1, the righteous person is compared to what?", options: ["A lion", "A tree planted by rivers of water", "A city on a hill", "A shepherd"], answer: 1, explain: "Psalm 1:3 contrasts the tree with the chaff of verse 4.", ref: "Psalm 1:3" },
          { q: "Which step comes first in careful reading?", options: ["Application", "Observation", "Interpretation", "Memorising"], answer: 1, explain: "First see what the text says, then what it meant, then what it asks of us." },
          { q: "In Matthew 7:24-27, what makes the difference between the two builders?", options: ["How much money they had", "Whether they heard and did Jesus' sayings", "Which city they lived in", "How long they took to build"], answer: 1, explain: "Both heard; only one acted on what he heard.", ref: "Matthew 7:24" }
        ]
      },
      {
        id: "texts", title: "Translations and manuscripts", minutes: 20,
        objectives: ["Explain why translations differ", "Name key manuscripts behind our Bibles", "Find a textual difference in the reader"],
        readings: ["Nehemiah 8:8", "Acts 8:35-38"],
        body: [
          "No original manuscript of any biblical book survives. Our Bibles are translated from copies. For the Old Testament, the Leningrad Codex (about AD 1008) is the oldest complete Hebrew Bible and stands behind most modern translations. The Dead Sea Scrolls, found from 1947, include copies of Old Testament books up to a thousand years older, such as the Great Isaiah Scroll.",
          "For the New Testament there are over 5,000 Greek manuscripts. Codex Sinaiticus, from the 4th century, contains the oldest complete New Testament. The KJV (1611) was translated from a Greek edition later called the Textus Receptus; most modern translations use critical editions that weigh all the manuscripts.",
          "Translations also differ in approach. Some keep close to the original word order (more 'formal'); others aim to give the meaning in natural English (more 'dynamic'). Both are honest attempts with different priorities.",
          "Try Acts 8:37 in the reader. The KJV includes it; the World English Bible does not, because the verse is missing from the Greek text it follows. Turn on Interlinear to see the Greek words marked as found only in the Textus Receptus."
        ],
        family: "The first Bible books were written by hand long ago, and people copied them carefully for centuries. Today, experts compare very old copies, like the Dead Sea Scrolls, to see what the writers first wrote.",
        familyQuestions: ["Why would people copy the Bible by hand so carefully?", "In Nehemiah 8:8, why did the teachers explain what they read?"],
        questions: ["What is gained and lost in a word-for-word translation compared with a meaning-for-meaning one?", "How should knowing about textual differences affect the way we use a verse like Acts 8:37?"],
        quiz: [
          { q: "Roughly when was the Leningrad Codex written?", options: ["About 200 BC", "About AD 400", "About AD 1008", "About AD 1611"], answer: 2, explain: "It is the oldest complete manuscript of the Hebrew Bible." },
          { q: "Codex Sinaiticus dates from which century?", options: ["1st", "4th", "9th", "16th"], answer: 1, explain: "It contains the oldest complete copy of the New Testament." },
          { q: "Why is Acts 8:37 missing from the World English Bible?", options: ["It was removed for doctrinal reasons", "It is absent from the Greek text the WEB follows", "It was a printing mistake", "The KJV added it in 1611"], answer: 1, explain: "The verse appears in the Textus Receptus but not in the Greek text behind the WEB or most modern editions.", ref: "Acts 8:37" }
        ]
      }
    ]
  },
  {
    id: "genesis", title: "Understanding Genesis", level: "Intermediate", status: "draft",
    summary: "Creation, the fall, the call of Abraham and the story of Joseph, read closely and with the main interpretations named fairly.",
    lessons: [
      {
        id: "creation", title: "Creation", minutes: 25,
        objectives: ["Trace the structure of the seven days", "Notice key Hebrew words", "Describe the main ways Christians read the days"],
        readings: ["Genesis 1", "Genesis 2:1-3"],
        body: [
          "Genesis 1 is carefully patterned. Many readers notice that days one to three form realms (light, sky and sea, land) and days four to six fill them (lights, birds and fish, animals and people). The seventh day is set apart: God rests and blesses it.",
          "The first verb, bara ('created'), in its basic (Qal) form always has God as its subject in the Old Testament. Open Genesis 1:1 in the Hebrew tab to see it, and notice that Elohim, a plural form, takes a singular verb.",
          "Christians read the days in several ways: as six ordinary days; as long ages; as a literary framework arranging the account by theme; or as God's work days described by analogy with ours. Each view is held by serious readers, and the text's main claims about God as sole Creator and the goodness of creation stand in all of them."
        ],
        family: "Genesis 1 tells how God made everything in an ordered way, day by day, and called it good. On the seventh day God rested, which shows that rest is a gift.",
        familyQuestions: ["What did God make on the day you like best?", "Why do you think God called creation good?"],
        questions: ["What does the pattern of days and the refrain 'it was good' teach about the world?", "Which reading of the days do you find most convincing, and why? What do the different readings agree on?"],
        quiz: [
          { q: "What did God do on the seventh day?", options: ["Created humans", "Rested and blessed the day", "Divided the waters", "Planted a garden"], answer: 1, explain: "Genesis 2:2-3.", ref: "Genesis 2:3" },
          { q: "On which day were the sun, moon and stars made?", options: ["Day one", "Day two", "Day four", "Day six"], answer: 2, explain: "Light appears on day one; the lights in the sky on day four.", ref: "Genesis 1:16" },
          { q: "In its basic (Qal) form, what is always the subject of the Hebrew verb bara ('created')?", options: ["God", "Humans", "Angels", "Any craftsman"], answer: 0, explain: "In this form it is used only of God's creating. Look up H1254 in Languages." }
        ]
      },
      {
        id: "fall", title: "The fall and its aftermath", minutes: 25,
        objectives: ["Follow the conversation in Genesis 3", "Identify the consequences of the fall", "Compare Jewish and Christian readings of Genesis 3:15"],
        readings: ["Genesis 3", "Genesis 4:1-16"],
        body: [
          "Genesis 3 turns on a question: 'Yea, hath God said?' The serpent casts doubt on God's word and goodness. The man and woman eat, hide, and blame each other and the serpent.",
          "The consequences touch every relationship: with God (they hide), with each other (blame and rule), and with the ground (thorns and toil). Genesis 4 shows the damage spreading as Cain kills his brother Abel.",
          "Genesis 3:15 speaks of enmity between the serpent's offspring and the woman's. Christian tradition since Irenaeus (2nd century) has read it as the first promise of a redeemer, sometimes called the protoevangelium. Jewish interpreters usually read it as describing the lasting conflict between humans and evil, or humans and snakes. Both readings are shown here; the text itself does not name a person."
        ],
        family: "Adam and Eve disobeyed God and then tried to hide. Things went wrong between people and God, and between people. But God still came looking for them and cared for them.",
        familyQuestions: ["Why did Adam and Eve hide?", "How did God still show care for them in Genesis 3:21?"],
        questions: ["How does the serpent's question 'Yea, hath God said?' still work today?", "What do you make of the two ways Genesis 3:15 has been read?"],
        quiz: [
          { q: "Whom did the woman say deceived her?", options: ["The man", "The serpent", "Cain", "An angel"], answer: 1, explain: "Genesis 3:13.", ref: "Genesis 3:13" },
          { q: "What was Abel's work?", options: ["A tiller of the ground", "A keeper of sheep", "A builder of cities", "A hunter"], answer: 1, explain: "Abel kept sheep; Cain tilled the ground.", ref: "Genesis 4:2" },
          { q: "Which reading of Genesis 3:15 calls it the 'first gospel'?", options: ["The common Jewish reading", "Traditional Christian reading since the 2nd century", "No one reads it that way", "Only modern scholars"], answer: 1, explain: "Irenaeus and later Christian writers; Jewish readings usually differ." }
        ]
      },
      {
        id: "abraham", title: "The call of Abraham", minutes: 25,
        objectives: ["State the promises of Genesis 12", "Connect Genesis 15:6 to the New Testament", "Use the map and timeline for Abraham's journey"],
        readings: ["Genesis 12:1-9", "Genesis 15:1-6"],
        body: [
          "After the spreading damage of Genesis 3 to 11, Genesis 12 begins something new. God calls Abram to leave his country and promises land, descendants and blessing, and that in him all families of the earth will be blessed.",
          "Abram is 75 when he leaves Haran. He travels to Shechem and Bethel and builds altars along the way. Open the History map and find Haran, Shechem and Bethel to follow the route.",
          "Genesis 15:6 says Abram believed the LORD, and it was counted to him for righteousness. Paul quotes it in Romans 4:3 and Galatians 3:6; James quotes it in James 2:23. They use it to make different emphases, which is a good exercise in reading each author in context.",
          "The dates in the timeline for Abraham follow a traditional reckoning. Historians debate whether, and how, the patriarchal stories can be dated."
        ],
        family: "God asked Abram to leave home and go to a new land. God promised to bless him and, through his family, to bless everyone in the world. Abram trusted God.",
        familyQuestions: ["How do you think Abram felt leaving home?", "What did God promise Abram?"],
        questions: ["Why might the promise to bless 'all families of the earth' matter after Genesis 3 to 11?", "Read Romans 4:3 and James 2:23. How does each author use Genesis 15:6?"],
        quiz: [
          { q: "How old was Abram when he left Haran?", options: ["40", "75", "99", "100"], answer: 1, explain: "Genesis 12:4.", ref: "Genesis 12:4" },
          { q: "Who quotes Genesis 15:6 in the New Testament?", options: ["Only Paul", "Paul and James", "Peter and John", "No one"], answer: 1, explain: "Romans 4:3, Galatians 3:6 and James 2:23." },
          { q: "Through Abram, who would be blessed according to Genesis 12:3?", options: ["Only his sons", "All families of the earth", "The kings of Canaan", "The priests"], answer: 1, explain: "The promise reaches beyond one family.", ref: "Genesis 12:3" }
        ]
      },
      {
        id: "joseph", title: "Joseph", minutes: 25,
        objectives: ["Follow the arc of the Joseph story", "Discuss providence in Genesis 50:20", "See how Genesis prepares for Exodus"],
        readings: ["Genesis 37:1-28", "Genesis 50:15-21"],
        body: [
          "Joseph, Jacob's favoured son, dreams of his brothers bowing to him. Jealous, they sell him into slavery. In Egypt he rises through suffering and prison to become second to Pharaoh, and in famine his brothers come to buy grain.",
          "The story closes with Joseph's words in Genesis 50:20: 'ye thought evil against me; but God meant it unto good.' The story holds human wrongdoing and God's purpose together without excusing the wrong.",
          "The end of Genesis leaves Jacob's family in Egypt, which sets the scene for Exodus."
        ],
        family: "Joseph's brothers were jealous and sold him. Many hard things happened, but God was with Joseph, and in the end Joseph forgave his brothers and saved his family from hunger.",
        familyQuestions: ["Why were Joseph's brothers jealous?", "How did Joseph show forgiveness?"],
        questions: ["How does Genesis 50:20 hold together human evil and God's purpose?", "Where do you see forgiveness costing Joseph something?"],
        quiz: [
          { q: "For how many pieces of silver was Joseph sold?", options: ["Ten", "Twenty", "Thirty", "Forty"], answer: 1, explain: "Genesis 37:28. Judas later receives thirty.", ref: "Genesis 37:28" },
          { q: "In Genesis 50:20, Joseph says his brothers meant evil, but God meant it for what?", options: ["Punishment", "Good", "A test of Pharaoh", "Nothing"], answer: 1, explain: "'God meant it unto good.'", ref: "Genesis 50:20" },
          { q: "Where is Jacob's family living at the end of Genesis?", options: ["Canaan", "Egypt", "Babylon", "Haran"], answer: 1, explain: "Which leads into the book of Exodus." }
        ]
      }
    ]
  },
  {
    id: "jesus", title: "The life of Jesus", level: "Beginner", status: "draft",
    summary: "Birth, teaching, miracles, death and resurrection, read in the Gospels with their historical setting.",
    lessons: [
      {
        id: "birth", title: "Birth", minutes: 20,
        objectives: ["Compare Matthew's and Luke's birth accounts", "Place the birth in its historical setting"],
        readings: ["Luke 2:1-20", "Matthew 2:1-12"],
        body: [
          "Only Matthew and Luke tell of Jesus' birth, and they tell it differently. Luke has the census, the manger and the shepherds. Matthew has the wise men, the star and King Herod. Both place the birth in Bethlehem.",
          "Matthew says the birth was in the days of Herod the Great, who most historians date to his death in 4 BC, so Jesus is usually dated about 6 to 4 BC. The AD system, worked out in the 6th century, was a few years off. Luke's mention of a census under Quirinius raises a known historical question that scholars answer in different ways."
        ],
        family: "Jesus was born in Bethlehem. Shepherds came to see him after angels told them the good news, and wise men followed a star to bring him gifts.",
        familyQuestions: ["Who came to see baby Jesus in Luke's story? Who came in Matthew's story?", "Why do you think God told shepherds first?"],
        questions: ["What does each Gospel's choice of visitors (shepherds, wise men) suggest about who Jesus came for?", "How should we handle details that are hard to fit with outside records?"],
        quiz: [
          { q: "In which town was Jesus born, according to both Matthew and Luke?", options: ["Nazareth", "Jerusalem", "Bethlehem", "Capernaum"], answer: 2, explain: "Matthew 2:1; Luke 2:4-7.", ref: "Matthew 2:1" },
          { q: "Which Roman emperor does Luke mention at Jesus' birth?", options: ["Tiberius", "Caesar Augustus", "Nero", "Claudius"], answer: 1, explain: "Luke 2:1.", ref: "Luke 2:1" },
          { q: "Why is Jesus usually dated a few years 'BC'?", options: ["A mistake in the Bible", "Herod died about 4 BC, and the AD calendar was set later with a small error", "Luke gives the exact year", "Because of the Julian calendar reform"], answer: 1, explain: "Matthew places the birth before Herod's death." }
        ]
      },
      {
        id: "teaching", title: "Teaching", minutes: 25,
        objectives: ["Read the opening of the Sermon on the Mount", "Interpret a parable in its setting"],
        readings: ["Matthew 5:1-16", "Luke 15:11-32"],
        body: [
          "The Sermon on the Mount opens with the Beatitudes: blessings on the poor in spirit, the mourners, the meek and the peacemakers. They describe life under God's reign, which reverses ordinary expectations.",
          "Luke 15 begins with critics complaining that Jesus welcomes sinners. He answers with three parables of the lost. The third, the prodigal son, ends with the elder brother outside the party: the story leaves Jesus' critics with a question about their own response."
        ],
        family: "Jesus taught that God blesses humble, kind and peacemaking people. He told a story about a son who ran away and a father who ran to welcome him home.",
        familyQuestions: ["What did the father do when his son came home?", "How can you be a peacemaker this week?"],
        questions: ["Who in Luke 15:1-2 is the elder brother meant to make think?", "Which Beatitude challenges you most, and why?"],
        quiz: [
          { q: "In Matthew 5:9, what will peacemakers be called?", options: ["The salt of the earth", "The children of God", "The light of the world", "The meek"], answer: 1, explain: "Matthew 5:9.", ref: "Matthew 5:9" },
          { q: "Who stays outside the celebration in Luke 15?", options: ["The father", "The younger son", "The elder son", "A servant"], answer: 2, explain: "Luke 15:28.", ref: "Luke 15:28" },
          { q: "What prompts the parables of Luke 15?", options: ["A question about taxes", "Complaints that Jesus receives sinners", "A storm at sea", "A request for a sign"], answer: 1, explain: "Luke 15:1-2.", ref: "Luke 15:2" }
        ]
      },
      {
        id: "identity", title: "Miracles and identity", minutes: 20,
        objectives: ["See how Mark builds the question 'Who is this?'", "Read Peter's confession in context"],
        readings: ["Mark 4:35-41", "Mark 8:27-33"],
        body: [
          "After Jesus calms the storm, the disciples ask, 'What manner of man is this, that even the wind and the sea obey him?' Mark lets the question hang through the first half of his Gospel.",
          "At Caesarea Philippi, Jesus asks, 'Whom say ye that I am?' Peter answers, 'Thou art the Christ.' Straight away Jesus teaches that he must suffer, and Peter rebukes him. Knowing the right title is not yet understanding the way of the cross."
        ],
        family: "Jesus calmed a big storm with just his words. His friends wondered who he really was. Later Peter said, 'You are the Christ', the one God promised to send.",
        familyQuestions: ["How do you think the disciples felt in the storm?", "Who did Peter say Jesus was?"],
        questions: ["Why does Jesus begin teaching about suffering immediately after Peter's confession?", "Where in your own understanding of Jesus might you be like Peter in Mark 8:32?"],
        quiz: [
          { q: "Where did Peter confess Jesus as the Christ in Mark 8?", options: ["Jerusalem", "Caesarea Philippi", "Bethany", "Nazareth"], answer: 1, explain: "Mark 8:27.", ref: "Mark 8:27" },
          { q: "What did the disciples ask after the storm was calmed?", options: ["Where shall we go?", "What manner of man is this?", "Who sinned?", "Is it lawful?"], answer: 1, explain: "Mark 4:41.", ref: "Mark 4:41" },
          { q: "What did Jesus begin to teach right after Peter's confession?", options: ["That he would become king of Rome", "That the Son of man must suffer", "That the temple would be rebuilt", "That they should leave Galilee"], answer: 1, explain: "Mark 8:31.", ref: "Mark 8:31" }
        ]
      },
      {
        id: "cross", title: "Death and resurrection", minutes: 25,
        objectives: ["Follow Mark's account of the crucifixion and empty tomb", "Read Paul's early summary of the resurrection witnesses", "Know what outside sources say"],
        readings: ["Mark 15:21-39", "Mark 16:1-8", "1 Corinthians 15:3-8"],
        body: [
          "Mark's account is spare. Simon of Cyrene carries the cross; Jesus is crucified between two thieves; at his death a Roman centurion says, 'Truly this man was the Son of God.'",
          "Mark 16:1-8 tells of women finding the tomb empty. The two oldest complete manuscripts, Codex Sinaiticus and Codex Vaticanus, end Mark at 16:8; verses 9 to 20 are found in most later manuscripts and are printed in the KJV.",
          "Paul's summary in 1 Corinthians 15:3-8, written in the 50s AD, lists witnesses including Peter, the twelve and more than five hundred at once. Outside the New Testament, the Roman historian Tacitus (about AD 116) records that Christus was executed by Pontius Pilate under Tiberius."
        ],
        family: "Jesus died on a cross, and his friends were very sad. On the third day, women found his tomb empty, and many people later saw him alive again.",
        familyQuestions: ["Who helped carry Jesus' cross?", "Why is the empty tomb such good news for Christians?"],
        questions: ["Why might it matter that a Roman centurion is the one who says 'Truly this man was the Son of God'?", "What does the early date of 1 Corinthians 15 add to the discussion of the resurrection?"],
        quiz: [
          { q: "Who carried Jesus' cross in Mark 15?", options: ["Peter", "Simon of Cyrene", "Joseph of Arimathea", "John"], answer: 1, explain: "Mark 15:21.", ref: "Mark 15:21" },
          { q: "How many people does Paul say saw the risen Jesus at once?", options: ["Twelve", "Seventy", "Above five hundred", "Three thousand"], answer: 2, explain: "1 Corinthians 15:6.", ref: "1 Corinthians 15:6" },
          { q: "Where do the oldest complete manuscripts end Mark's Gospel?", options: ["16:8", "16:20", "15:39", "16:1"], answer: 0, explain: "Codex Sinaiticus and Codex Vaticanus end at 16:8." }
        ]
      }
    ]
  },
  {
    id: "hebrew", title: "Biblical Hebrew: first steps", level: "Beginner", status: "draft",
    summary: "The alphabet, reading Genesis 1:1, how roots work, and a handful of words worth knowing, using the app's interlinear.",
    lessons: [
      {
        id: "alphabet", title: "The alphabet", minutes: 25,
        objectives: ["Know that Hebrew has 22 consonants written right to left", "Recognise the five final forms", "See the alphabet at work in Psalm 119"],
        readings: ["Psalm 119:1-8"],
        body: [
          "Biblical Hebrew is written right to left with 22 letters, all consonants. Five letters change shape at the end of a word: kaph ך, mem ם, nun ן, pe ף and tsade ץ.",
          "Vowels were originally not written. The dots and dashes you see in the reader are vowel points, added by scholars called the Masoretes between about the 7th and 10th centuries AD to preserve the traditional pronunciation.",
          "Psalm 119 is an acrostic: 22 stanzas of 8 verses, each stanza starting every line with the same letter in alphabetical order, 176 verses in all. Turn on Interlinear for Psalm 119:1-8 and see each verse begin with aleph (א)."
        ],
        family: "Hebrew is written from right to left, the opposite way to English. Psalm 119 is like an alphabet poem, with a section for every letter.",
        familyQuestions: ["Can you write your name from right to left?", "Why might someone write a poem using every letter of the alphabet?"],
        questions: ["What might an alphabet structure say about the psalm's view of God's word?", "Look at Psalm 119:1 in Interlinear. Which letter starts the first word?"],
        quiz: [
          { q: "How many letters are in the Hebrew alphabet?", options: ["22", "24", "26", "28"], answer: 0, explain: "All of them consonants." },
          { q: "Which direction is Hebrew written?", options: ["Left to right", "Right to left", "Top to bottom", "Either way"], answer: 1, explain: "That is why the interlinear runs right to left." },
          { q: "How many verses does each stanza of Psalm 119 have?", options: ["Four", "Eight", "Twelve", "Twenty-two"], answer: 1, explain: "22 stanzas × 8 verses = 176.", ref: "Psalm 119:176" }
        ]
      },
      {
        id: "genesis11", title: "Reading Genesis 1:1", minutes: 25,
        objectives: ["Read the seven Hebrew words of Genesis 1:1 with the interlinear", "Recognise prefixes and the object marker"],
        readings: ["Genesis 1:1"],
        body: [
          "Genesis 1:1 has seven Hebrew words: bereshit (in the beginning), bara (created), Elohim (God), et, hashamayim (the heavens), ve'et, ha'arets (the earth).",
          "Hebrew attaches small words to the front of others. Be- means 'in', ha- means 'the', and ve- means 'and'. Tap each word in the Hebrew tab to see the parts.",
          "Et has no English equivalent. It marks the direct object of the verb, so the interlinear glosses it as <obj.>. Elohim has a plural ending but takes the singular verb bara when it refers to Israel's God."
        ],
        family: "The very first sentence of the Bible has just seven words in Hebrew. One of them, 'et', is a little helper word that English does not need.",
        familyQuestions: ["How many words does Genesis 1:1 have in English? In Hebrew?", "Can you find the word for God, Elohim, in the interlinear?"],
        questions: ["What does it add to your reading to see the Hebrew word order?", "Why might translators disagree about how to render Elohim's plural form?"],
        quiz: [
          { q: "How many Hebrew words are in Genesis 1:1?", options: ["Five", "Seven", "Ten", "Twelve"], answer: 1, explain: "Count them in the Hebrew tab.", ref: "Genesis 1:1" },
          { q: "What does the word אֵת (et) do?", options: ["Means 'God'", "Marks the direct object", "Means 'and'", "Means 'the end'"], answer: 1, explain: "It is untranslated; the interlinear shows <obj.>." },
          { q: "What does the prefix ha- mean?", options: ["In", "And", "The", "Not"], answer: 2, explain: "As in hashamayim, the heavens." }
        ]
      },
      {
        id: "roots", title: "How roots work", minutes: 25,
        objectives: ["Understand three-letter roots", "Spot related words built from one root"],
        readings: ["Numbers 6:24-26"],
        body: [
          "Most Hebrew words grow from a root of three consonants. Patterns of vowels, prefixes and suffixes turn the root into nouns, verbs and adjectives.",
          "The root sh-l-m gives shalom (peace, wholeness) and shalem (complete). The root m-l-k gives melekh (king), malakh (he reigned) and mamlakhah (kingdom). The root d-b-r gives davar (word, thing) and dibber (he spoke).",
          "A shared root shows a family of meaning, but it does not fix a word's sense in a given verse. Context still decides. In the priestly blessing of Numbers 6:24-26, shalom closes the blessing; tap it in the Hebrew tab to see its root and other uses."
        ],
        family: "Many Hebrew words are like families: they share three special letters. Shalom, which means peace, belongs to a family of words about being whole and complete.",
        familyQuestions: ["What does shalom mean?", "Can you think of English words that belong to one family, like 'play', 'player' and 'playful'?"],
        questions: ["How might knowing that shalom means wholeness, not just quiet, change how you hear Numbers 6:26?", "Why is it risky to read a root's meaning into every word built from it?"],
        quiz: [
          { q: "Most Hebrew roots have how many consonants?", options: ["Two", "Three", "Four", "Five"], answer: 1, explain: "Three-consonant roots are the norm." },
          { q: "Which word comes from the same root as melekh (king)?", options: ["Shalom", "Mamlakhah (kingdom)", "Davar (word)", "Torah"], answer: 1, explain: "Both come from m-l-k." },
          { q: "Which word closes the priestly blessing in Numbers 6:26?", options: ["Hesed", "Shalom (peace)", "Torah", "Berit"], answer: 1, explain: "'The LORD lift up his countenance upon thee, and give thee peace.'", ref: "Numbers 6:26" }
        ]
      },
      {
        id: "words", title: "Words worth knowing", minutes: 25,
        objectives: ["Learn six key Old Testament words", "Use word study pages to see their range of meaning"],
        readings: ["Genesis 8:1", "Psalm 136:1-9"],
        body: [
          "Hesed (H2617) is loyal, covenant love: kindness that keeps faith. Psalm 136 repeats it in every verse, 'for his mercy endureth for ever.'",
          "Berit (H1285) means covenant. Torah (H8451) means instruction or law. Nephesh (H5315) is often translated 'soul' but usually means a living being, a life, or a person.",
          "Ruach (H7307) can mean spirit, wind or breath. In Genesis 8:1 God makes a ruach, a wind, pass over the earth. The same word is used of God's Spirit in Genesis 1:2. One Hebrew word rarely has one English equivalent.",
          "Open each word in Languages to see its lexicon entry and every verse where it appears."
        ],
        family: "Hesed is a Hebrew word for God's kind and faithful love that never gives up. Ruach can mean wind, breath or spirit.",
        familyQuestions: ["Psalm 136 repeats one line again and again. What is it?", "Take a deep breath. Why might the same word mean breath and spirit?"],
        questions: ["What is lost when nephesh is always translated 'soul'?", "How does the repetition in Psalm 136 work on the reader?"],
        quiz: [
          { q: "Which word describes God's loyal, covenant love?", options: ["Ruach", "Hesed", "Nephesh", "Davar"], answer: 1, explain: "Psalm 136 repeats it in every verse." },
          { q: "In Genesis 8:1, what does ruach mean?", options: ["A soul", "A wind", "A law", "A promise"], answer: 1, explain: "'God made a wind to pass over the earth.'", ref: "Genesis 8:1" },
          { q: "What does torah most basically mean?", options: ["Book", "Instruction", "Temple", "Sacrifice"], answer: 1, explain: "Instruction or teaching, often translated 'law'." }
        ]
      }
    ]
  }
];

export const PLANNED = [
  ["The prophets", "Isaiah to Malachi in their historical crises"],
  ["Understanding Revelation", "Apocalyptic writing, symbols, and the main ways the book has been read"],
  ["The historical Paul", "Paul's letters, journeys and world"],
  ["Introduction to Koine Greek", "The alphabet to reading John 1:1"],
  ["Biblical archaeology", "What excavations show and what they cannot"],
  ["How the canon was formed", "How the books of the Bible came to be recognised"]
];
