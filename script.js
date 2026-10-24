
/* ==========================================
   InkSphere — Blog Website
   Public reading + owner-only publishing
   ========================================== */

// 1. SUPABASE CONFIGURATION
// Replace these with your own Supabase project details.
const SUPABASE_URL = "https://alyolvbjumwsrftyuxra.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NsKL31ZEG9E706O9NR0eSA_4KuhZ5kj";

// Must match the email used in supabase-setup.sql.
const OWNER_EMAIL = "suryanshyadav7333@gmail.com";

const TABLE_NAME = "blog_posts";

// Supabase client
let supabaseClient = null;

if (
  window.supabase &&
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_SUPABASE")
) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

// 2. PAGE ELEMENTS
const blogGrid = document.getElementById("blogGrid");
const emptyState = document.getElementById("emptyState");
const storyCount = document.getElementById("storyCount");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

const adminModal = document.getElementById("adminModal");
const openAdmin = document.getElementById("openAdmin");
const emptyPublish = document.getElementById("emptyPublish");
const closeAdmin = document.getElementById("closeAdmin");

const loginPanel = document.getElementById("loginPanel");
const loginButton = document.getElementById("loginButton");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");

const publishForm = document.getElementById("publishForm");
const signOutButton = document.getElementById("signOutButton");
const formNotice = document.getElementById("formNotice");
const toast = document.getElementById("toast");

// 3. LOCAL DEMO STORAGE
// Used only when Supabase has not been configured.
// Demo posts remain in this browser only.
const DEMO_STORAGE_KEY = "inksphere_demo_posts_v1";

let allBlogs = [];
let currentSearch = "";
let currentUser = null;
let toastTimeout = null;

// 4. SMALL HELPERS
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function showNotice(message, isError = false) {
  if (!formNotice) return;

  formNotice.textContent = message;
  formNotice.classList.toggle("error", isError);
}

function formatDate(dateValue) {
  if (!dateValue) return "A story to enjoy";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "A story to enjoy";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getReadingTime(content) {
  const words = String(content || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 200)) + " min read";
}

function normalizeBlog(row) {
  return {
    id: row.id,
    title: row.title || "Untitled story",
    category: row.category || "Ideas",
    excerpt: row.excerpt || "",
    content: row.content || "",
    cover_url: row.cover_url || "",
    read_time: row.read_time || getReadingTime(row.content),
    created_at: row.created_at || new Date().toISOString()
  };
}

function isOwner() {
  return Boolean(
    currentUser &&
    currentUser.email &&
    currentUser.email.toLowerCase() === OWNER_EMAIL.toLowerCase()
  );
}

// 5. MODAL CONTROLS
function openPublishModal() {
  if (!adminModal) return;

  adminModal.classList.add("open");
  adminModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  showNotice("");

  if (isOwner()) {
    showPublishPanel();
  } else {
    showLoginPanel();
  }
}

function closePublishModal() {
  if (!adminModal) return;

  adminModal.classList.remove("open");
  adminModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function showLoginPanel() {
  if (loginPanel) loginPanel.classList.remove("hidden");
  if (publishForm) publishForm.classList.add("hidden");
}

function showPublishPanel() {
  if (loginPanel) loginPanel.classList.add("hidden");
  if (publishForm) publishForm.classList.remove("hidden");
}

// 6. BLOG CARD DISPLAY
function renderBlogs() {
  if (!blogGrid || !emptyState || !storyCount) return;

  const query = currentSearch.toLowerCase().trim();

  const visibleBlogs = allBlogs.filter(blog => {
    const searchableText = [
      blog.title,
      blog.category,
      blog.excerpt,
      blog.content
    ].join(" ").toLowerCase();

    return searchableText.includes(query);
  });

  storyCount.textContent =
    `${visibleBlogs.length} ${visibleBlogs.length === 1 ? "story" : "stories"}`;

  blogGrid.innerHTML = "";

  if (allBlogs.length === 0) {
    emptyState.classList.remove("hidden");
    emptyState.querySelector("h3").innerHTML =
      "No stories here… <em>yet.</em>";

    emptyState.querySelector("p").innerHTML =
      "The reading room is waiting for its very first story.<br>" +
      "Check back soon for something wonderful.";

    return;
  }

  emptyState.classList.add("hidden");

  if (visibleBlogs.length === 0) {
    blogGrid.innerHTML = `
      <div class="search-empty">
        <h3>No matching stories found</h3>
        <p>Try another keyword or category.</p>
        <button class="btn btn-primary" id="clearSearch">
          Clear search
        </button>
      </div>
    `;

    document.getElementById("clearSearch")
      ?.addEventListener("click", () => {
        currentSearch = "";
        if (searchInput) searchInput.value = "";
        renderBlogs();
      });

    return;
  }

  visibleBlogs.forEach((blog, index) => {
    const card = document.createElement("article");
    card.className = "blog-card";
    card.style.animationDelay = `${index * 60}ms`;

    const cover = blog.cover_url &&
      /^https?:\/\//i.test(blog.cover_url)
      ? `
        <div class="blog-cover">
          <img
            src="${escapeHTML(blog.cover_url)}"
            alt="${escapeHTML(blog.title)}"
            loading="lazy"
          >
        </div>
      `
      : `
        <div class="blog-cover blog-cover-placeholder">
          <span>${escapeHTML(blog.category)}</span>
          <span class="cover-star">✦</span>
        </div>
      `;

    card.innerHTML = `
      ${cover}
      <div class="blog-card-body">
        <div class="blog-meta">
          <span class="category-tag">
            ${escapeHTML(blog.category)}
          </span>
          <span>${escapeHTML(blog.read_time)}</span>
        </div>

        <h3>${escapeHTML(blog.title)}</h3>

        <p class="blog-excerpt">
          ${escapeHTML(blog.excerpt)}
        </p>

        <div class="blog-card-footer">
          <span>${escapeHTML(formatDate(blog.created_at))}</span>
          <button
            class="read-link"
            type="button"
            data-read-id="${escapeHTML(blog.id)}"
          >
            Read story <span>→</span>
          </button>
        </div>
      </div>
    `;

    blogGrid.appendChild(card);
  });

  blogGrid.querySelectorAll("[data-read-id]").forEach(button => {
    button.addEventListener("click", () => {
      const blog = allBlogs.find(
        item => String(item.id) === button.dataset.readId
      );

      if (blog) openFullStory(blog);
    });
  });

  // Handle cover images that fail to load.
  blogGrid.querySelectorAll(".blog-cover img").forEach(image => {
    image.addEventListener("error", () => {
      const placeholder = document.createElement("div");
      placeholder.className = "blog-cover blog-cover-placeholder";

      const category = document.createElement("span");
      category.textContent =
        image.closest(".blog-card")?.querySelector(".category-tag")
          ?.textContent || "Ideas";

      placeholder.appendChild(category);
      image.parentElement.replaceWith(placeholder);
    }, { once: true });
  });
}

// 7. FULL ARTICLE READER
function openFullStory(blog) {
  const existing = document.getElementById("storyReader");
  if (existing) existing.remove();

  const reader = document.createElement("div");
  reader.id = "storyReader";
  reader.className = "story-reader-backdrop";

  const article = document.createElement("article");
  article.className = "story-reader";

  const closeButton = document.createElement("button");
  closeButton.className = "modal-close reader-close";
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close story");

  closeButton.addEventListener("click", () => reader.remove());

  const category = document.createElement("span");
  category.className = "section-kicker";
  category.textContent = blog.category;

  const title = document.createElement("h1");
  title.textContent = blog.title;

  const meta = document.createElement("p");
  meta.className = "reader-meta";
  meta.textContent =
    `${formatDate(blog.created_at)} · ${blog.read_time}`;

  const excerpt = document.createElement("p");
  excerpt.className = "reader-excerpt";
  excerpt.textContent = blog.excerpt;

  const content = document.createElement("div");
  content.className = "reader-content";

  // Use text nodes so blog content is displayed as text,
  // not executed as HTML.
  String(blog.content || "").split(/\n{2,}/).forEach(paragraph => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    content.appendChild(p);
  });

  article.append(closeButton, category, title, meta, excerpt);

  if (blog.cover_url && /^https?:\/\//i.test(blog.cover_url)) {
    const image = document.createElement("img");
    image.className = "reader-cover";
    image.src = blog.cover_url;
    image.alt = blog.title;
    image.onerror = () => image.remove();
    article.appendChild(image);
  }

  article.appendChild(content);
  reader.appendChild(article);
  document.body.appendChild(reader);

  reader.addEventListener("click", event => {
    if (event.target === reader) reader.remove();
  });

  const escapeHandler = event => {
    if (event.key === "Escape") {
      reader.remove();
      document.removeEventListener("keydown", escapeHandler);
    }
  };

  document.addEventListener("keydown", escapeHandler);
  reader.scrollTop = 0;
}

// 8. LOAD BLOGS
async function loadBlogs() {
  if (!supabaseClient) {
    loadDemoBlogs();
    return;
  }

  blogGrid.innerHTML = `
    <div class="loading-state">
      <span class="loading-spinner"></span>
      <p>Opening the reading room…</p>
    </div>
  `;

  try {
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select("id,title,category,excerpt,content,cover_url,read_time,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    allBlogs = (data || []).map(normalizeBlog);
    renderBlogs();
  } catch (error) {
    console.error("Could not load blogs:", error);

    blogGrid.innerHTML = `
      <div class="search-empty">
        <h3>We couldn't load the stories</h3>
        <p>Check your Supabase configuration and internet connection.</p>
        <button class="btn btn-primary" id="retryBlogs">
          Try again
        </button>
      </div>
    `;

    document.getElementById("retryBlogs")
      ?.addEventListener("click", loadBlogs);

    showToast("Unable to load blogs. Check your Supabase setup.");
  }
}

function loadDemoBlogs() {
  try {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY);
    allBlogs = saved ? JSON.parse(saved).map(normalizeBlog) : [];
  } catch (error) {
    console.error("Could not read demo blogs:", error);
    allBlogs = [];
  }

  renderBlogs();
}

function saveDemoBlogs() {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(allBlogs));
}

// 9. OWNER LOGIN
async function loginOwner() {
  if (!supabaseClient) {
    showNotice(
      "First configure your Supabase URL and publishable key in script.js.",
      true
    );
    return;
  }

  const email = adminEmail.value.trim();
  const password = adminPassword.value;

  if (!email || !password) {
    showNotice("Enter your owner email and password.", true);
    return;
  }

  if (email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    showNotice("This email is not authorized to publish blogs.", true);
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Signing in…";
  showNotice("");

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    currentUser = data.user;

    if (!isOwner()) {
      await supabaseClient.auth.signOut();
      currentUser = null;
      throw new Error("This account is not the authorized blog owner.");
    }

    adminPassword.value = "";
    showPublishPanel();
    showNotice("You're signed in. Your next story awaits!");
    showToast("Welcome back, author!");

  } catch (error) {
    showNotice(error.message || "Sign-in failed.", true);
  } finally {
    loginButton.disabled = false;
    loginButton.innerHTML = 'Sign in to publish <span>→</span>';
  }
}

// 10. PUBLISH A BLOG
async function publishBlog(event) {
  event.preventDefault();

  if (!supabaseClient) {
    showNotice(
      "Publishing requires Supabase configuration. Add your project URL and publishable key first.",
      true
    );
    return;
  }

  if (!isOwner()) {
    showNotice("Please sign in with your authorized owner account.", true);
    showLoginPanel();
    return;
  }

  const title = document.getElementById("blogTitle").value.trim();
  const category = document.getElementById("blogCategory").value;
  const excerpt = document.getElementById("blogExcerpt").value.trim();
  const content = document.getElementById("blogContent").value.trim();
  const coverUrl = document.getElementById("blogCover").value.trim();
  const readTime = document.getElementById("blogReadTime").value;

  if (!title || !excerpt || !content) {
    showNotice("Please complete the title, description, and story.", true);
    return;
  }

  if (coverUrl && !/^https?:\/\//i.test(coverUrl)) {
    showNotice("Cover image must use a valid HTTP or HTTPS URL.", true);
    return;
  }

  const publishButton = publishForm.querySelector(
    'button[type="submit"]'
  );

  publishButton.disabled = true;
  publishButton.textContent = "Publishing your story…";
  showNotice("");

  try {
    // Re-check the authenticated user before inserting.
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
      throw new Error("Your session expired. Please sign in again.");
    }

    if (
      userData.user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()
    ) {
      throw new Error("Only the authorized owner can publish.");
    }

    const post = {
      title,
      category,
      excerpt,
      content,
      cover_url: coverUrl || null,
      read_time: readTime,
      published: true
    };

    const { error } = await supabaseClient
      .from(TABLE_NAME)
      .insert(post);

    if (error) throw error;

    publishForm.reset();
    showNotice("Your story is published!");
    showToast("Your new story is live!");

    await loadBlogs();

    setTimeout(() => {
      closePublishModal();
      document.getElementById("stories")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 800);

  } catch (error) {
    console.error("Publishing failed:", error);
    showNotice(error.message || "Could not publish this story.", true);
  } finally {
    publishButton.disabled = false;
    publishButton.innerHTML = 'Publish story <span>✦</span>';
  }
}

// 11. SIGN OUT
async function signOutOwner() {
  if (supabaseClient) {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      showNotice(error.message, true);
      return;
    }
  }

  currentUser = null;
  showLoginPanel();
  showNotice("You have signed out.");
  showToast("Signed out successfully.");
}

// 12. INITIALIZE AUTHENTICATION
async function initializeAuth() {
  if (!supabaseClient) {
    currentUser = null;
    showLoginPanel();
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Could not check session:", error);
    return;
  }

  const sessionUser = data.session?.user || null;

  if (
    sessionUser &&
    sessionUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
  ) {
    currentUser = sessionUser;
    showPublishPanel();
  } else {
    currentUser = null;
    showLoginPanel();
  }

  // Keep the publishing panel in sync with session changes.
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;

    currentUser =
      user &&
      user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
        ? user
        : null;

    if (isOwner()) {
      showPublishPanel();
    } else {
      showLoginPanel();
    }
  });
}

// 13. EVENT LISTENERS
openAdmin?.addEventListener("click", openPublishModal);
emptyPublish?.addEventListener("click", openPublishModal);
closeAdmin?.addEventListener("click", closePublishModal);

adminModal?.addEventListener("click", event => {
  if (event.target === adminModal) closePublishModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closePublishModal();
});

loginButton?.addEventListener("click", loginOwner);
publishForm?.addEventListener("submit", publishBlog);
signOutButton?.addEventListener("click", signOutOwner);

searchForm?.addEventListener("submit", event => {
  event.preventDefault();
  currentSearch = searchInput.value;
  renderBlogs();

  document.getElementById("stories")
    ?.scrollIntoView({ behavior: "smooth" });
});

searchInput?.addEventListener("input", () => {
  currentSearch = searchInput.value;
  renderBlogs();
});

// 14. START THE WEBSITE
(async function startInkSphere() {
  if (supabaseClient) {
    await initializeAuth();
  }

  await loadBlogs();
})();
