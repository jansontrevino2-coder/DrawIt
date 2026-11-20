// ============================================================
// DRAWIT - FULL APP.JS
// PFPs + Supabase + Drawing + Working Fill Tool
// ============================================================


// ============================================================
// SUPABASE
// ============================================================

const SUPABASE_URL =
    "https://fhsybbufrlmunfxrhseo.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_4SnUg6PibU4jfZQkIKkyNw_YU5sYAwi";

const db =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ============================================================
// HELPERS
// ============================================================

const $ = id =>
    document.getElementById(id);


function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


function showMessage(text) {

    const message =
        $("message");

    message.textContent =
        text;

    message.classList.remove(
        "hidden"
    );

    clearTimeout(
        showMessage.timer
    );

    showMessage.timer =
        setTimeout(() => {

            message.classList.add(
                "hidden"
            );

        }, 4500);
}


// ============================================================
// STATE
// ============================================================

let currentUser =
    null;

let currentProfile =
    null;

let posts =
    [];

let replies =
    [];

let profiles =
    new Map();

let selectedPostId =
    null;


// ============================================================
// DRAWING STATE
// ============================================================

let currentTool =
    "brush";

let drawing =
    false;

let canvasReady =
    false;

let drawingHistory =
    [];

const canvas =
    $("drawingCanvas");

const ctx =
    canvas.getContext(
        "2d",
        {
            willReadFrequently: true
        }
    );


// ============================================================
// AVATARS
// ============================================================

function avatarHTML(
    profile,
    className = "avatar"
) {

    const username =
        profile?.username
        || "?";

    const avatar =
        profile?.avatar_url;

    if (avatar) {

        return `
            <span class="${className}">
                <img
                    src="${escapeHTML(avatar)}"
                    alt="${escapeHTML(username)} profile picture"
                >
            </span>
        `;
    }

    return `
        <span class="${className}">
            ${escapeHTML(
                username
                    .charAt(0)
                    .toUpperCase()
            )}
        </span>
    `;
}


function paintAvatar(
    element,
    profile
) {

    if (!element)
        return;

    if (
        profile?.avatar_url
    ) {

        element.innerHTML =
            `
            <img
                src="${escapeHTML(
                    profile.avatar_url
                )}"
                alt="Profile picture"
            >
            `;

        return;
    }

    element.textContent =
        (
            profile?.username
            || "?"
        )
        .charAt(0)
        .toUpperCase();
}


// ============================================================
// PAGE NAVIGATION
// ============================================================

function openPage(page) {

    document
        .querySelectorAll(
            ".page"
        )
        .forEach(element => {

            element
                .classList
                .remove("active");

        });


    document
        .querySelectorAll(
            ".nav"
        )
        .forEach(button => {

            button
                .classList
                .toggle(
                    "active",
                    button.dataset.page
                    === page
                );

        });


    const pageElement =
        $(
            page + "Page"
        );

    if (pageElement) {

        pageElement
            .classList
            .add("active");

    }


    if (
        page === "draw"
    ) {

        setTimeout(
            initializeCanvas,
            50
        );

    }


    if (
        page === "profile"
    ) {

        renderOwnProfile();

    }
}


document
    .querySelectorAll(
        "[data-page]"
    )
    .forEach(button => {

        button.onclick =
            () =>
                openPage(
                    button.dataset.page
                );

    });


// ============================================================
// SIGN UP
// ============================================================

$("signupButton").onclick =
async () => {

    const username =
        $("usernameInput")
            .value
            .trim();

    const email =
        $("emailInput")
            .value
            .trim();

    const password =
        $("passwordInput")
            .value;


    if (
        username.length < 3
    ) {

        showMessage(
            "Username must be at least 3 characters."
        );

        return;
    }


    if (
        !email ||
        !password
    ) {

        showMessage(
            "Enter your email and password."
        );

        return;
    }


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


    if (error) {

        showMessage(
            error.message
        );

        return;
    }


    if (
        data.session
    ) {

        showMessage(
            "Account created!"
        );

    } else {

        showMessage(
            "Account created. Check your email if confirmation is enabled."
        );

    }

};


// ============================================================
// LOGIN
// ============================================================

$("loginButton").onclick =
async () => {

    const email =
        $("emailInput")
            .value
            .trim();

    const password =
        $("passwordInput")
            .value;


    const {
        error
    } =
        await db.auth
            .signInWithPassword({

                email,
                password

            });


    if (error) {

        showMessage(
            error.message
        );

    }

};


// ============================================================
// LOGOUT
// ============================================================

$("logoutButton").onclick =
async () => {

    await db.auth.signOut();

};


// ============================================================
// AUTH USER
// ============================================================

async function setUser(
    user
) {

    currentUser =
        user;


    if (!user) {

        $("authPage")
            .classList
            .remove("hidden");

        $("appPage")
            .classList
            .add("hidden");

        $("bottomNav")
            .classList
            .add("hidden");

        $("logoutButton")
            .classList
            .add("hidden");

        $("profileButton")
            .classList
            .add("hidden");

        return;
    }


    $("authPage")
        .classList
        .add("hidden");

    $("appPage")
        .classList
        .remove("hidden");

    $("bottomNav")
        .classList
        .remove("hidden");

    $("logoutButton")
        .classList
        .remove("hidden");

    $("profileButton")
        .classList
        .remove("hidden");


    await ensureProfile();

    await loadFeed();

    openPage(
        "feed"
    );

}


// ============================================================
// PROFILE
// ============================================================

async function ensureProfile() {

    const {
        data,
        error
    } =
        await db
            .from("profiles")
            .select("*")
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();


    if (error) {

        showMessage(
            error.message
        );

        return;
    }


    let profile =
        data;


    if (!profile) {

        const username =
            currentUser
                .user_metadata
                ?.username

            ||

            currentUser
                .email
                ?.split("@")[0]

            ||

            "User";


        const result =
            await db
                .from("profiles")
                .insert({

                    id:
                        currentUser.id,

                    username

                })
                .select()
                .single();


        if (result.error) {

            showMessage(
                result.error.message
            );

            return;
        }


        profile =
            result.data;

    }


    currentProfile =
        profile;


    $("headerName")
        .textContent =
        profile.username;


    paintAvatar(
        $("headerAvatar"),
        profile
    );


    paintAvatar(
        $("composerAvatar"),
        profile
    );

}


// ============================================================
// PROFILE PAGE
// ============================================================

$("profileButton").onclick =
() => {

    openPage(
        "profile"
    );

};


function renderOwnProfile() {

    if (!currentProfile)
        return;


    $("profileUsername")
        .value =
        currentProfile.username;


    paintAvatar(
        $("profilePreview"),
        currentProfile
    );

}


// ============================================================
// SAVE PROFILE
// ============================================================

$("saveProfileButton").onclick =
async () => {

    const username =
        $("profileUsername")
            .value
            .trim();

    const file =
        $("avatarInput")
            .files[0];


    if (
        username.length < 3
    ) {

        showMessage(
            "Username must be at least 3 characters."
        );

        return;
    }


    if (
        file &&
        file.size >
        2 * 1024 * 1024
    ) {

        showMessage(
            "Profile picture must be 2 MB or smaller."
        );

        return;
    }


    let avatarURL =
        currentProfile
            ?.avatar_url
        || null;


    if (file) {

        const extension =
            (
                file.name
                    .split(".")
                    .pop()
                || "jpg"
            )
            .toLowerCase();


        const path =
            `${currentUser.id}/avatar-${Date.now()}.${extension}`;


        const upload =
            await db.storage
                .from(
                    "avatars"
                )
                .upload(
                    path,
                    file,
                    {
                        cacheControl:
                            "3600",

                        upsert:
                            false
                    }
                );


        if (
            upload.error
        ) {

            showMessage(
                upload.error.message
            );

            return;
        }


        avatarURL =
            db.storage
                .from(
                    "avatars"
                )
                .getPublicUrl(
                    path
                )
                .data
                .publicUrl;

    }


    const {
        data,
        error
    } =
        await db
            .from(
                "profiles"
            )
            .update({

                username,

                avatar_url:
                    avatarURL,

                updated_at:
                    new Date()
                        .toISOString()

            })
            .eq(
                "id",
                currentUser.id
            )
            .select()
            .single();


    if (error) {

        showMessage(
            error.message
        );

        return;
    }


    currentProfile =
        data;


    $("avatarInput")
        .value =
        "";


    await loadFeed();

    renderOwnProfile();


    showMessage(
        "Profile updated!"
    );

};


// ============================================================
// POST CHARACTER COUNTER
// ============================================================

$("postInput").oninput =
() => {

    $("counter")
        .textContent =
        `${
            $("postInput")
                .value
                .length
        } / 500`;

};


// ============================================================
// CREATE POST
// ============================================================

$("postButton").onclick =
async () => {

    const content =
        $("postInput")
            .value
            .trim();


    if (!content)
        return;


    const {
        error
    } =
        await db
            .from(
                "posts"
            )
            .insert({

                user_id:
                    currentUser.id,

                content

            });


    if (error) {

        showMessage(
            error.message
        );

        return;
    }


    $("postInput")
        .value =
        "";


    $("counter")
        .textContent =
        "0 / 500";


    await loadFeed();

};


// ============================================================
// LOAD FEED
// ============================================================

async function loadFeed() {

    const [
        postResult,
        replyResult,
        profileResult
    ] =
        await Promise.all([

            db
                .from("posts")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                ),

            db
                .from("replies")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:
                            true
                    }
                ),

            db
                .from("profiles")
                .select(
                    "id, username, avatar_url"
                )

        ]);


    const error =
        postResult.error
        ||
        replyResult.error
        ||
        profileResult.error;


    if (error) {

        showMessage(
            error.message
        );

        return;
    }


    posts =
        postResult.data
        || [];


    replies =
        replyResult.data
        || [];


    profiles =
        new Map(

            (
                profileResult.data
                || []
            )
            .map(
                profile =>
                    [
                        profile.id,
                        profile
                    ]
            )

        );


    currentProfile =
        profiles.get(
            currentUser.id
        )
        ||
        currentProfile;


    if (currentProfile) {

        $("headerName")
            .textContent =
            currentProfile.username;


        paintAvatar(
            $("headerAvatar"),
            currentProfile
        );


        paintAvatar(
            $("composerAvatar"),
            currentProfile
        );

    }


    renderFeed();

}


// ============================================================
// RENDER FEED
// ============================================================

function renderFeed() {

    const feed =
        $("feed");


    if (
        posts.length === 0
    ) {

        feed.innerHTML =
            `
            <div class="hint">
                No posts yet.
                Make the first one!
            </div>
            `;

        return;
    }


    feed.innerHTML =
        posts
            .map(post => {

                const profile =
                    profiles.get(
                        post.user_id
                    );


                const postReplies =
                    replies.filter(
                        reply =>
                            reply.post_id
                            === post.id
                    );


                const replyHTML =
                    postReplies
                        .map(reply => {

                            const replyProfile =
                                profiles.get(
                                    reply.user_id
                                );


                            const header =
                                `
                                <div class="reply-head">

                                    ${avatarHTML(
                                        replyProfile
                                    )}

                                    <span>
                                        ${escapeHTML(
                                            replyProfile
                                                ?.username
                                            ||
                                            "Deleted user"
                                        )}
                                        ${
                                            reply.type
                                            === "drawing"
                                            ?
                                            " · 🎨 drawing"
                                            :
                                            ""
                                        }
                                    </span>

                                </div>
                                `;


                            if (
                                reply.type
                                === "drawing"
                            ) {

                                return `
                                <div class="reply">

                                    ${header}

                                    <img
                                        class="drawing-reply"
                                        src="${escapeHTML(
                                            reply.content
                                        )}"
                                        alt="Drawing reply"
                                    >

                                </div>
                                `;

                            }


                            return `
                            <div class="reply">

                                ${header}

                                <div class="reply-text">${escapeHTML(
                                    reply.content
                                )}</div>

                            </div>
                            `;

                        })
                        .join("");


                return `
                <article class="post">

                    <div class="post-head">

                        ${avatarHTML(
                            profile
                        )}

                        <div class="post-user">

                            <b>
                                ${escapeHTML(
                                    profile
                                        ?.username
                                    ||
                                    "Deleted user"
                                )}
                            </b>

                            <span class="meta">

                                ${escapeHTML(
                                    new Date(
                                        post.created_at
                                    )
                                    .toLocaleString()
                                )}

                            </span>

                        </div>

                    </div>


                    <div class="post-text">${escapeHTML(
                        post.content
                    )}</div>


                    <div class="actions">

                        <button
                            class="action"
                            onclick="
                                toggleReply(
                                    ${post.id}
                                )
                            "
                        >
                            💬 Text reply
                        </button>


                        <button
                            class="action"
                            onclick="
                                startDrawingReply(
                                    ${post.id}
                                )
                            "
                        >
                            🎨 Draw reply
                        </button>


                        <span class="action">

                            ${postReplies.length}

                            ${
                                postReplies.length
                                === 1
                                ?
                                "reply"
                                :
                                "replies"
                            }

                        </span>

                    </div>


                    <div
                        id="reply-${post.id}"
                        class="reply-box"
                    >

                        <textarea
                            id="replyInput-${post.id}"
                            maxlength="500"
                            placeholder="Write a reply..."
                        ></textarea>

                        <div class="reply-submit">

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


                    <div>
                        ${replyHTML}
                    </div>

                </article>
                `;

            })
            .join("");

}


// ============================================================
// TEXT REPLIES
// ============================================================

window.toggleReply =
postId => {

    $(
        `reply-${postId}`
    )
    .classList
    .toggle(
        "open"
    );

};


window.submitTextReply =
async postId => {

    const input =
        $(
            `replyInput-${postId}`
        );


    const content =
        input
            .value
            .trim();


    if (!content)
        return;


    const {
        error
    } =
        await db
            .from(
                "replies"
            )
            .insert({

                post_id:
                    postId,

                user_id:
                    currentUser.id,

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

};


// ============================================================
// START DRAWING REPLY
// ============================================================

window.startDrawingReply =
postId => {

    const post =
        posts.find(
            item =>
                item.id
                === postId
        );


    if (!post)
        return;


    const profile =
        profiles.get(
            post.user_id
        );


    selectedPostId =
        postId;


    $("selectedPostContent")
        .innerHTML =
        `
        <b>
            ${escapeHTML(
                profile?.username
                || "User"
            )}
        </b>

        <div>
            ${escapeHTML(
                post.content
            )}
        </div>
        `;


    openPage(
        "draw"
    );


    setTimeout(
        () => {

            initializeCanvas(
                true
            );

            clearCanvas(
                false
            );

        },
        80
    );

};


// ============================================================
// CANVAS INITIALIZATION
// ============================================================

function initializeCanvas(
    preserve = true
) {

    const rect =
        canvas
            .getBoundingClientRect();


    if (
        rect.width <= 0 ||
        rect.height <= 0
    ) {

        return;
    }


    let oldImage =
        null;


    if (
        preserve &&
        canvasReady &&
        canvas.width > 0 &&
        canvas.height > 0
    ) {

        oldImage =
            canvas.toDataURL(
                "image/png"
            );

    }


    const ratio =
        window.devicePixelRatio
        || 1;


    canvas.width =
        Math.max(
            1,
            Math.round(
                rect.width
                *
                ratio
            )
        );


    canvas.height =
        Math.max(
            1,
            Math.round(
                rect.height
                *
                ratio
            )
        );


    ctx.fillStyle =
        "#ffffff";


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    canvasReady =
        true;


    if (oldImage) {

        const image =
            new Image();


        image.onload =
        () => {

            ctx.drawImage(
                image,
                0,
                0,
                canvas.width,
                canvas.height
            );

        };


        image.src =
            oldImage;

    }

}


// ============================================================
// POINTER TO REAL CANVAS COORDINATES
// ============================================================

function getCanvasPoint(
    event
) {

    const rect =
        canvas
            .getBoundingClientRect();


    const x =
        Math.floor(

            (
                event.clientX
                -
                rect.left
            )

            *

            (
                canvas.width
                /
                rect.width
            )

        );


    const y =
        Math.floor(

            (
                event.clientY
                -
                rect.top
            )

            *

            (
                canvas.height
                /
                rect.height
            )

        );


    return {

        x:
            Math.max(
                0,
                Math.min(
                    canvas.width - 1,
                    x
                )
            ),

        y:
            Math.max(
                0,
                Math.min(
                    canvas.height - 1,
                    y
                )
            )

    };

}


// ============================================================
// HISTORY
// ============================================================

function saveHistory() {

    if (
        !canvasReady ||
        canvas.width === 0
    ) {

        return;
    }


    drawingHistory.push(
        canvas.toDataURL(
            "image/png"
        )
    );


    if (
        drawingHistory.length
        > 25
    ) {

        drawingHistory.shift();

    }

}


// ============================================================
// TOOLS
// ============================================================

function setTool(
    tool
) {

    currentTool =
        tool;


    $("brushTool")
        .classList
        .toggle(
            "active",
            tool === "brush"
        );


    $("fillTool")
        .classList
        .toggle(
            "active",
            tool === "fill"
        );


    $("eraserTool")
        .classList
        .toggle(
            "active",
            tool === "eraser"
        );


    if (
        tool === "fill"
    ) {

        canvas.style.cursor =
            "cell";

    } else {

        canvas.style.cursor =
            "crosshair";

    }

}


$("brushTool").onclick =
() => {

    setTool(
        "brush"
    );

};


$("fillTool").onclick =
() => {

    setTool(
        "fill"
    );

};


$("eraserTool").onclick =
() => {

    setTool(
        "eraser"
    );

};


// ============================================================
// COLOR CONVERSION
// ============================================================

function hexToRGBA(
    hex
) {

    return {

        r:
            parseInt(
                hex.slice(
                    1,
                    3
                ),
                16
            ),

        g:
            parseInt(
                hex.slice(
                    3,
                    5
                ),
                16
            ),

        b:
            parseInt(
                hex.slice(
                    5,
                    7
                ),
                16
            ),

        a:
            255

    };

}


// ============================================================
// FILL COLOR MATCHING
//
// IMPORTANT:
// Brush edges are anti-aliased, so pixels around a brush stroke
// are slightly different colors. A tolerance makes the bucket
// actually usable instead of requiring pixel-perfect equality.
// ============================================================

function pixelMatchesTarget(
    pixels,
    index,
    target,
    tolerance = 20
) {

    return (

        Math.abs(
            pixels[index]
            -
            target.r
        )
        <= tolerance

        &&

        Math.abs(
            pixels[index + 1]
            -
            target.g
        )
        <= tolerance

        &&

        Math.abs(
            pixels[index + 2]
            -
            target.b
        )
        <= tolerance

        &&

        Math.abs(
            pixels[index + 3]
            -
            target.a
        )
        <= tolerance

    );

}


// ============================================================
// WORKING FLOOD FILL
// ============================================================

function floodFill(
    startX,
    startY,
    hexColor
) {

    startX =
        Math.floor(
            startX
        );


    startY =
        Math.floor(
            startY
        );


    const width =
        canvas.width;


    const height =
        canvas.height;


    if (

        startX < 0

        ||

        startY < 0

        ||

        startX >= width

        ||

        startY >= height

    ) {

        return;

    }


    const imageData =
        ctx.getImageData(
            0,
            0,
            width,
            height
        );


    const pixels =
        imageData.data;


    const startPixel =
        startY
        *
        width
        +
        startX;


    const startIndex =
        startPixel
        *
        4;


    const target = {

        r:
            pixels[
                startIndex
            ],

        g:
            pixels[
                startIndex + 1
            ],

        b:
            pixels[
                startIndex + 2
            ],

        a:
            pixels[
                startIndex + 3
            ]

    };


    const replacement =
        hexToRGBA(
            hexColor
        );


    if (

        target.r
        === replacement.r

        &&

        target.g
        === replacement.g

        &&

        target.b
        === replacement.b

        &&

        target.a
        === replacement.a

    ) {

        return;

    }


    const visited =
        new Uint8Array(
            width
            *
            height
        );


    const stack =
        [
            startPixel
        ];


    while (
        stack.length > 0
    ) {

        const pixel =
            stack.pop();


        if (
            visited[pixel]
        ) {

            continue;

        }


        visited[pixel] =
            1;


        const x =
            pixel
            %
            width;


        const y =
            Math.floor(
                pixel
                /
                width
            );


        const index =
            pixel
            *
            4;


        if (
            !pixelMatchesTarget(
                pixels,
                index,
                target
            )
        ) {

            continue;

        }


        pixels[index] =
            replacement.r;


        pixels[index + 1] =
            replacement.g;


        pixels[index + 2] =
            replacement.b;


        pixels[index + 3] =
            replacement.a;


        // LEFT

        if (
            x > 0
        ) {

            stack.push(
                pixel - 1
            );

        }


        // RIGHT

        if (
            x <
            width - 1
        ) {

            stack.push(
                pixel + 1
            );

        }


        // UP

        if (
            y > 0
        ) {

            stack.push(
                pixel - width
            );

        }


        // DOWN

        if (
            y <
            height - 1
        ) {

            stack.push(
                pixel + width
            );

        }

    }


    ctx.putImageData(
        imageData,
        0,
        0
    );

}


// ============================================================
// POINTER DOWN
// ============================================================

canvas.addEventListener(
    "pointerdown",
    event => {

        event.preventDefault();


        initializeCanvas();


        const point =
            getCanvasPoint(
                event
            );


        // ----------------------------------------
        // FILL TOOL
        // ----------------------------------------

        if (
            currentTool
            === "fill"
        ) {

            saveHistory();


            floodFill(

                point.x,

                point.y,

                $("brushColor")
                    .value

            );


            return;
        }


        // ----------------------------------------
        // BRUSH / ERASER
        // ----------------------------------------

        saveHistory();


        drawing =
            true;


        try {

            canvas
                .setPointerCapture(
                    event.pointerId
                );

        } catch (error) {

            // Pointer capture is optional.

        }


        ctx.beginPath();


        ctx.moveTo(
            point.x,
            point.y
        );


        ctx.lineTo(
            point.x + 0.01,
            point.y + 0.01
        );


        applyStroke();

    }
);


// ============================================================
// POINTER MOVE
// ============================================================

canvas.addEventListener(
    "pointermove",
    event => {

        if (!drawing)
            return;


        event.preventDefault();


        const point =
            getCanvasPoint(
                event
            );


        ctx.lineTo(
            point.x,
            point.y
        );


        applyStroke();

    }
);


// ============================================================
// APPLY BRUSH / ERASER
// ============================================================

function applyStroke() {

    const ratio =
        window.devicePixelRatio
        || 1;


    ctx.lineCap =
        "round";


    ctx.lineJoin =
        "round";


    ctx.lineWidth =
        Number(
            $("brushSize")
                .value
        )
        *
        ratio;


    if (
        currentTool
        === "eraser"
    ) {

        ctx.strokeStyle =
            "#ffffff";

    } else {

        ctx.strokeStyle =
            $("brushColor")
                .value;

    }


    ctx.stroke();

}


// ============================================================
// STOP DRAWING
// ============================================================

function stopDrawing() {

    if (!drawing)
        return;


    drawing =
        false;


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


window.addEventListener(
    "pointerup",
    stopDrawing
);


// ============================================================
// CLEAR CANVAS
// ============================================================

function clearCanvas(
    save = false
) {

    initializeCanvas();


    if (save) {

        saveHistory();

    }


    ctx.fillStyle =
        "#ffffff";


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    if (!save) {

        drawingHistory =
            [];

    }


    setTool(
        "brush"
    );

}


$("clearButton").onclick =
() => {

    clearCanvas(
        true
    );

};


// ============================================================
// UNDO
// ============================================================

$("undoButton").onclick =
() => {

    if (
        drawingHistory.length
        === 0
    ) {

        return;
    }


    const previous =
        drawingHistory.pop();


    const image =
        new Image();


    image.onload =
    () => {

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


// ============================================================
// CANCEL DRAWING
// ============================================================

$("cancelDrawingButton").onclick =
() => {

    selectedPostId =
        null;


    $("selectedPostContent")
        .textContent =
        "Choose “Draw Reply” on a post first.";


    clearCanvas(
        false
    );


    openPage(
        "feed"
    );

};


// ============================================================
// POST DRAWING
// ============================================================

$("postDrawingButton").onclick =
async () => {

    if (
        !selectedPostId
    ) {

        showMessage(
            "Choose a post from the Feed first."
        );

        return;
    }


    const content =
        canvas.toDataURL(
            "image/png"
        );


    $("postDrawingButton")
        .disabled =
        true;


    $("postDrawingButton")
        .textContent =
        "Posting...";


    const {
        error
    } =
        await db
            .from(
                "replies"
            )
            .insert({

                post_id:
                    selectedPostId,

                user_id:
                    currentUser.id,

                type:
                    "drawing",

                content

            });


    $("postDrawingButton")
        .disabled =
        false;


    $("postDrawingButton")
        .textContent =
        "Post drawing";


    if (error) {

        showMessage(
            error.message
        );

        return;
    }


    selectedPostId =
        null;


    $("selectedPostContent")
        .textContent =
        "Choose “Draw Reply” on a post first.";


    clearCanvas(
        false
    );


    await loadFeed();


    openPage(
        "feed"
    );


    showMessage(
        "Drawing posted! 🎨"
    );

};


// ============================================================
// CANVAS RESIZE
// ============================================================

let resizeTimer =
    null;


window.addEventListener(
    "resize",
    () => {

        if (
            !$("drawPage")
                .classList
                .contains(
                    "active"
                )
        ) {

            return;
        }


        clearTimeout(
            resizeTimer
        );


        resizeTimer =
            setTimeout(
                () => {

                    initializeCanvas(
                        true
                    );

                },
                150
            );

    }
);


// ============================================================
// AUTH LISTENER
// ============================================================

db.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

        setUser(
            session?.user
            || null
        );

    }
);


// ============================================================
// INITIAL SESSION
// ============================================================

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
