// ============================================
// DRAWIT SUPABASE CONFIG
// ============================================

const SUPABASE_URL =
    "https://fhsybbufrlmunfxrhseo.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_4SnUg6PibU4jfZQkIKkyNw_YU5sYAwi";

const db =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ============================================
// ELEMENT HELPER
// ============================================

const $ = id =>
    document.getElementById(id);


// ============================================
// STATE
// ============================================

let currentUser = null;

let currentUsername = "";

let posts = [];

let replies = [];

let selectedPostId = null;

let drawingReady = false;

let drawing = false;

let erasing = false;

let drawingHistory = [];


// ============================================
// ELEMENTS
// ============================================

const authPage =
    $("authPage");

const appPage =
    $("appPage");

const bottomNav =
    $("bottomNav");

const message =
    $("message");

const feed =
    $("feed");

const feedPage =
    $("feedPage");

const drawPage =
    $("drawPage");

const feedNav =
    $("feedNav");

const drawNav =
    $("drawNav");

const usernameInput =
    $("usernameInput");

const emailInput =
    $("emailInput");

const passwordInput =
    $("passwordInput");

const signupButton =
    $("signupButton");

const loginButton =
    $("loginButton");

const logoutButton =
    $("logoutButton");

const postInput =
    $("postInput");

const postButton =
    $("postButton");

const counter =
    $("counter");

const canvas =
    $("drawingCanvas");

const brushColor =
    $("brushColor");

const brushSize =
    $("brushSize");

const eraserButton =
    $("eraserButton");

const undoButton =
    $("undoButton");

const clearButton =
    $("clearButton");

const postDrawingButton =
    $("postDrawingButton");

const cancelDrawingButton =
    $("cancelDrawingButton");

const selectedPostContent =
    $("selectedPostContent");


// ============================================
// MESSAGE
// ============================================

function showMessage(text) {

    if (!text) {

        message.style.display =
            "none";

        return;

    }

    message.textContent =
        text;

    message.style.display =
        "block";

    clearTimeout(
        showMessage.timer
    );

    showMessage.timer =
        setTimeout(() => {

            message.style.display =
                "none";

        }, 4000);
}


// ============================================
// HTML SAFETY
// ============================================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// ============================================
// ACCOUNT CREATION
// ============================================

signupButton.onclick =
async () => {

    const username =
        usernameInput.value.trim();

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    if (!username) {

        showMessage(
            "Enter a username."
        );

        return;
    }

    if (!email) {

        showMessage(
            "Enter your email."
        );

        return;
    }

    if (!password) {

        showMessage(
            "Enter a password."
        );

        return;
    }

    signupButton.disabled =
        true;

    const {
        data,
        error
    } =
        await db.auth.signUp({

            email,

            password,

            options: {

                data: {
                    username
                }

            }

        });

    signupButton.disabled =
        false;

    if (error) {

        showMessage(
            error.message
        );

        return;
    }

    if (data.session) {

        await setUser(
            data.user
        );

    } else {

        showMessage(
            "Account created! Check your email if confirmation is enabled."
        );

    }
};


// ============================================
// LOGIN
// ============================================

loginButton.onclick =
async () => {

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    if (
        !email ||
        !password
    ) {

        showMessage(
            "Enter your email and password."
        );

        return;
    }

    loginButton.disabled =
        true;

    const {
        data,
        error
    } =
        await db.auth
            .signInWithPassword({

                email,
                password

            });

    loginButton.disabled =
        false;

    if (error) {

        showMessage(
            error.message
        );

        return;
    }

    await setUser(
        data.user
    );
};


// ============================================
// LOGOUT
// ============================================

logoutButton.onclick =
async () => {

    await db.auth.signOut();

};


// ============================================
// AUTH STATE
// ============================================

async function setUser(user) {

    currentUser =
        user || null;

    if (!currentUser) {

        currentUsername = "";

        authPage.classList.remove(
            "hidden"
        );

        appPage.classList.add(
            "hidden"
        );

        bottomNav.classList.add(
            "hidden"
        );

        logoutButton.classList.add(
            "hidden"
        );

        return;
    }

    currentUsername =
        currentUser
            .user_metadata
            ?.username
        ||
        currentUser.email
            ?.split("@")[0]
        ||
        "User";

    authPage.classList.add(
        "hidden"
    );

    appPage.classList.remove(
        "hidden"
    );

    bottomNav.classList.remove(
        "hidden"
    );

    logoutButton.classList.remove(
        "hidden"
    );

    openPage("feed");

    await loadFeed();
}


// ============================================
// NAVIGATION
// ============================================

feedNav.onclick =
() => {

    openPage("feed");

};


drawNav.onclick =
() => {

    openPage("draw");

};


function openPage(page) {

    feedPage.classList.remove(
        "active"
    );

    drawPage.classList.remove(
        "active"
    );

    feedNav.classList.remove(
        "active"
    );

    drawNav.classList.remove(
        "active"
    );

    if (page === "draw") {

        drawPage.classList.add(
            "active"
        );

        drawNav.classList.add(
            "active"
        );

        setTimeout(
            initializeCanvas,
            30
        );

        return;
    }

    feedPage.classList.add(
        "active"
    );

    feedNav.classList.add(
        "active"
    );
}


// ============================================
// POST COUNTER
// ============================================

postInput.addEventListener(
    "input",
    () => {

        counter.textContent =
            `${postInput.value.length} / 500`;

    }
);


// ============================================
// CREATE POST
// ============================================

postButton.onclick =
async () => {

    const content =
        postInput.value.trim();

    if (!content)
        return;

    postButton.disabled =
        true;

    const {
        error
    } =
        await db
            .from("posts")
            .insert({

                user_id:
                    currentUser.id,

                username:
                    currentUsername,

                content

            });

    postButton.disabled =
        false;

    if (error) {

        showMessage(
            error.message
        );

        return;
    }

    postInput.value = "";

    counter.textContent =
        "0 / 500";

    await loadFeed();
};


// ============================================
// LOAD FEED
// ============================================

async function loadFeed() {

    feed.innerHTML =
        `
        <div class="empty">
            Loading DrawIt...
        </div>
        `;

    const [
        postResult,
        replyResult
    ] =
        await Promise.all([

            db
                .from("posts")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                ),

            db
                .from("replies")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                )

        ]);

    if (postResult.error) {

        showMessage(
            postResult.error.message
        );

        return;
    }

    if (replyResult.error) {

        showMessage(
            replyResult.error.message
        );

        return;
    }

    posts =
        postResult.data || [];

    replies =
        replyResult.data || [];

    renderFeed();
}


// ============================================
// RENDER FEED
// ============================================

function renderFeed() {

    if (!posts.length) {

        feed.innerHTML =
            `
            <div class="empty">
                No posts yet.<br>
                Be the first person to post 👀
            </div>
            `;

        return;
    }

    feed.innerHTML =
        posts.map(post => {

            const postReplies =
                replies.filter(
                    reply =>
                        reply.post_id
                        === post.id
                );

            const repliesHTML =
                postReplies
                    .map(reply => {

                        if (
                            reply.type
                            === "drawing"
                        ) {

                            return `
                            <div class="reply">

                                <div class="reply-user">
                                    ${escapeHTML(reply.username)}
                                    · 🎨 drawing
                                </div>

                                <img
                                    class="drawing-reply"
                                    src="${reply.content}"
                                    alt="Drawing reply"
                                >

                            </div>
                            `;
                        }

                        return `
                        <div class="reply">

                            <div class="reply-user">
                                ${escapeHTML(reply.username)}
                            </div>

                            <div class="reply-text">${escapeHTML(reply.content)}</div>

                        </div>
                        `;

                    })
                    .join("");

            return `

            <article class="post">

                <div class="post-header">

                    <div class="avatar">
                        ${escapeHTML(
                            post.username
                                .charAt(0)
                                .toUpperCase()
                        )}
                    </div>

                    <div class="user-details">

                        <div class="username">
                            ${escapeHTML(post.username)}
                        </div>

                        <div class="post-date">
                            ${escapeHTML(
                                new Date(
                                    post.created_at
                                )
                                .toLocaleString()
                            )}
                        </div>

                    </div>

                </div>

                <div class="post-text">${escapeHTML(post.content)}</div>

                <div class="post-actions">

                    <button
                        class="post-action"
                        onclick="
                            toggleTextReply(
                                ${post.id}
                            )
                        "
                    >
                        💬 Reply
                    </button>

                    <button
                        class="post-action draw-action"
                        onclick="
                            startDrawingReply(
                                ${post.id}
                            )
                        "
                    >
                        🎨 Draw Reply
                    </button>

                    <button
                        class="post-action"
                    >
                        ${postReplies.length}
                        ${
                            postReplies.length === 1
                                ? "Reply"
                                : "Replies"
                        }
                    </button>

                </div>

                <div
                    id="reply-${post.id}"
                    class="reply-composer"
                >

                    <textarea
                        id="replyInput-${post.id}"
                        maxlength="500"
                        placeholder="Write a reply..."
                    ></textarea>

                    <div class="reply-buttons">

                        <button
                            class="primary"
                            onclick="
                                submitTextReply(
                                    ${post.id}
                                )
                            "
                        >
                            Reply
                        </button>

                    </div>

                </div>

                <div class="replies">
                    ${repliesHTML}
                </div>

            </article>

            `;

        })
        .join("");
}


// ============================================
// TEXT REPLY
// ============================================

function toggleTextReply(
    postId
) {

    const composer =
        $(
            `reply-${postId}`
        );

    composer.classList.toggle(
        "open"
    );
}


async function submitTextReply(
    postId
) {

    const input =
        $(
            `replyInput-${postId}`
        );

    const content =
        input.value.trim();

    if (!content)
        return;

    const {
        error
    } =
        await db
            .from("replies")
            .insert({

                post_id:
                    postId,

                user_id:
                    currentUser.id,

                username:
                    currentUsername,

                type:
                    "text",

                content

            });

    if (error) {

        showMessage(
            error.message
        );

        return;
    }

    await loadFeed();
}


// ============================================
// START DRAWING REPLY
// ============================================

function startDrawingReply(
    postId
) {

    const post =
        posts.find(
            item =>
                item.id === postId
        );

    if (!post)
        return;

    selectedPostId =
        postId;

    selectedPostContent.innerHTML =
        `
        <strong>
            ${escapeHTML(post.username)}
        </strong>

        <div style="margin-top:5px;">
            ${escapeHTML(post.content)}
        </div>
        `;

    openPage("draw");

    setTimeout(() => {

        initializeCanvas();

        clearCanvas();

    }, 40);
}


// ============================================
// CANVAS
// ============================================

function initializeCanvas() {

    if (
        drawingReady &&
        canvas.width > 0
    )
        return;

    const rect =
        canvas
            .getBoundingClientRect();

    if (
        rect.width === 0 ||
        rect.height === 0
    )
        return;

    const ratio =
        window.devicePixelRatio
        || 1;

    canvas.width =
        Math.floor(
            rect.width * ratio
        );

    canvas.height =
        Math.floor(
            rect.height * ratio
        );

    const ctx =
        canvas.getContext("2d");

    ctx.fillStyle =
        "#ffffff";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawingReady =
        true;
}


// ============================================
// CANVAS POINTER POSITION
// ============================================

function getCanvasPosition(
    event
) {

    const rect =
        canvas
            .getBoundingClientRect();

    return {

        x:
            (
                event.clientX
                - rect.left
            )
            *
            (
                canvas.width
                / rect.width
            ),

        y:
            (
                event.clientY
                - rect.top
            )
            *
            (
                canvas.height
                / rect.height
            )

    };
}


// ============================================
// START DRAW
// ============================================

canvas.addEventListener(
    "pointerdown",
    event => {

        initializeCanvas();

        const ctx =
            canvas.getContext("2d");

        drawingHistory.push(
            canvas.toDataURL()
        );

        if (
            drawingHistory.length
            > 30
        ) {

            drawingHistory.shift();

        }

        drawing =
            true;

        canvas.setPointerCapture(
            event.pointerId
        );

        const point =
            getCanvasPosition(
                event
            );

        ctx.beginPath();

        ctx.moveTo(
            point.x,
            point.y
        );

    }
);


// ============================================
// DRAW MOVE
// ============================================

canvas.addEventListener(
    "pointermove",
    event => {

        if (!drawing)
            return;

        const ctx =
            canvas.getContext("2d");

        const ratio =
            window.devicePixelRatio
            || 1;

        const point =
            getCanvasPosition(
                event
            );

        ctx.lineCap =
            "round";

        ctx.lineJoin =
            "round";

        ctx.lineWidth =
            Number(
                brushSize.value
            )
            *
            ratio;

        ctx.strokeStyle =
            erasing
                ? "#ffffff"
                : brushColor.value;

        ctx.lineTo(
            point.x,
            point.y
        );

        ctx.stroke();

    }
);


// ============================================
// STOP DRAW
// ============================================

function stopDrawing() {

    drawing =
        false;

    const ctx =
        canvas.getContext("2d");

    ctx.closePath();
}


canvas.addEventListener(
    "pointerup",
    stopDrawing
);

canvas.addEventListener(
    "pointercancel",
    stopDrawing
);

canvas.addEventListener(
    "pointerleave",
    stopDrawing
);


// ============================================
// ERASER
// ============================================

eraserButton.onclick =
() => {

    erasing =
        !erasing;

    eraserButton.classList.toggle(
        "active",
        erasing
    );

    eraserButton.textContent =
        erasing
            ? "✏️ Brush"
            : "🧽 Eraser";
};


// ============================================
// CLEAR
// ============================================

clearButton.onclick =
() => {

    if (!drawingReady) {

        initializeCanvas();

    }

    drawingHistory.push(
        canvas.toDataURL()
    );

    const ctx =
        canvas.getContext("2d");

    ctx.fillStyle =
        "#ffffff";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
};


// ============================================
// UNDO
// ============================================

undoButton.onclick =
() => {

    if (
        drawingHistory.length === 0
    )
        return;

    const previous =
        drawingHistory.pop();

    const image =
        new Image();

    image.onload =
    () => {

        const ctx =
            canvas.getContext("2d");

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
        );

    };

    image.src =
        previous;
};


// ============================================
// CLEAR FUNCTION
// ============================================

function clearCanvas() {

    initializeCanvas();

    const ctx =
        canvas.getContext("2d");

    ctx.fillStyle =
        "#ffffff";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawingHistory =
        [];

    erasing =
        false;

    eraserButton.classList.remove(
        "active"
    );

    eraserButton.textContent =
        "🧽 Eraser";
}


// ============================================
// POST DRAWING
// ============================================

postDrawingButton.onclick =
async () => {

    if (!selectedPostId) {

        showMessage(
            "Choose a post from the Feed first."
        );

        openPage("feed");

        return;
    }

    initializeCanvas();

    postDrawingButton.disabled =
        true;

    postDrawingButton.textContent =
        "Posting...";

    const image =
        canvas.toDataURL(
            "image/png"
        );

    const {
        error
    } =
        await db
            .from("replies")
            .insert({

                post_id:
                    selectedPostId,

                user_id:
                    currentUser.id,

                username:
                    currentUsername,

                type:
                    "drawing",

                content:
                    image

            });

    postDrawingButton.disabled =
        false;

    postDrawingButton.textContent =
        "Post Drawing";

    if (error) {

        showMessage(
            error.message
        );

        return;
    }

    clearCanvas();

    selectedPostId =
        null;

    selectedPostContent.textContent =
        "Select a post from the Feed first.";

    await loadFeed();

    openPage("feed");

    showMessage(
        "Drawing posted! 🎨"
    );
};


// ============================================
// CANCEL DRAWING
// ============================================

cancelDrawingButton.onclick =
() => {

    selectedPostId =
        null;

    selectedPostContent.textContent =
        "Select a post from the Feed first.";

    clearCanvas();

    openPage("feed");
};


// ============================================
// AUTH LISTENER
// ============================================

db.auth.onAuthStateChange(
    async (
        event,
        session
    ) => {

        await setUser(
            session?.user
            || null
        );

    }
);


// ============================================
// INITIAL SESSION
// ============================================

(async () => {

    const {
        data,
        error
    } =
        await db.auth
            .getSession();

    if (error) {

        showMessage(
            error.message
        );

        return;
    }

    await setUser(
        data.session?.user
        || null
    );

})();
