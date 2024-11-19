const periodicRefreshPeriod = 10;
let categories = [];
let selectedCategory = "";
let currentETag = "";
let hold_Periodic_Refresh = false;
let pageManager;
let itemLayout;

let waiting = null;
let waitingGifTrigger = 2000;
function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        $("#itemsPanel").append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}
Init_UI();

async function Init_UI() {
    itemLayout = {
        width: $("#sample").outerWidth(),
        height: $("#sample").outerHeight()
    };
    pageManager = new PageManager('scrollPanel', 'itemsPanel', itemLayout, renderPosts);
    compileCategories();
    $('#createPost').on("click", async function () {
        renderCreatePostForm();
    });
    $('#research').on("click",async function (){
        let input = $('#inputSearch').val().trim();
        
        renderPosts("/",input);
        $('#inputSearch').val('');
    });
    $('#abort').on("click", async function () {
        showPosts()
    });
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    showPosts();
    start_Periodic_Refresh();
}

async function renderPosts(queryString = "",input = null) {
    let endOfData = false;
    queryString += "&sort=category";
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    addWaitingGif();
    let response = await Posts_API.Get(queryString);
    if (!Posts_API.error) {
        currentETag = response.ETag;
        let Posts = response.data;
        let sortedPosts = [];
        if(input != null){
            $("#itemsPanel").empty(); 
            let containsInput = [];
            Posts.forEach(post=>{
                if(post.Title.trim().toLowerCase().includes(input.toLowerCase()) ||post.Text.trim().toLowerCase().includes(input.toLowerCase()) ){
                    containsInput.push(post);
                }
            });
             sortedPosts = containsInput.sort((a, b) => b.Creation - a.Creation);
        }
        else
            sortedPosts = Posts.sort((a, b) => b.Creation - a.Creation);
        if (sortedPosts.length > 0) {
            sortedPosts.forEach(Post => {
                $("#itemsPanel").append(renderPost(Post));
            });
            $(".editCmd").off();
            $(".editCmd").on("click", function () {
                renderEditPostForm($(this).attr("editPostId"));
            });
            $(".deleteCmd").off();
            $(".deleteCmd").on("click", function () {
                renderDeletePostForm($(this).attr("deletePostId"));
            });
        } else
            endOfData = true;
    } else {
        renderError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}
function renderPost(Post) {
    newdate = convertToFrenchDate(Post.Creation);
    return $(`
     <div class="PostRow" Post_id=${Post.Id}">
        <div class="PostContainer noselect">
            
            <div class="PostLayout">
                <div class="PostCommandPanel">
                    <span class="editCmd cmdIcon fa fa-pencil" editPostId="${Post.Id}" title="Modifier ${Post.Title}"></span>
                    <span class="deleteCmd cmdIcon fa fa-trash" deletePostId="${Post.Id}" title="Effacer ${Post.Title}"></span>
                </div>
                <span class="PostCategory">${Post.Category}</span>
                <div class="Post">
                    <span class="PostTitle">${Post.Title}</span>
                    <br>
                   <div class="avatar" style="background-image:url('${Post.Image}')"></div>
                </div>
                <div>${newdate}</div>
                 <p>${Post.Text}</p>
                 <hr>
            </div>
           
            
        </div>
    </div>           
    `);
}
function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!hold_Periodic_Refresh) {
            let etag = await Posts_API.HEAD();
            if (currentETag != etag) {
                currentETag = etag;
                await pageManager.update(false);
                compileCategories();
            }
        }
    },
        periodicRefreshPeriod * 1000);
}
function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    
    return jsonObject;
}
async function renderEditPostForm(id) {
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(Post);
        else
            renderError("Post introuvable!");
    } else {
        renderError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}
function hidePosts() {
    $("#scrollPanel").hide();
    $("#createPost").hide();
    $("#abort").show();
    hold_Periodic_Refresh = true;
}
function newPost() {
    Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Category = "";
    Post.Creation = "";
    return Post;
}
function renderAbout() {
    hidePosts();
    $("#actionTitle").text("À propos...");
    $("#aboutContainer").show();
}
async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            updateDropDownMenu(categories);
        }
    }
}
function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#allCatCmd').on("click", function () {
        showPosts();
        selectedCategory = "";
        updateDropDownMenu();
        pageManager.reset();
    });
    $('.category').on("click", function () {
        showPosts();
        selectedCategory = $(this).text().trim();
        updateDropDownMenu();
        pageManager.reset();
    });
}
function showPosts() {
    $("#actionTitle").text("Liste des Nouvelles");
    $("#scrollPanel").show();
    $('#abort').hide();
    $('#postForm').hide();
    $('#aboutContainer').hide();
    $("#createPost").show();
    hold_Periodic_Refresh = false;
}
function renderError(message) {
    hidePosts();
    $("#actionTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").append($(`<div>${message}</div>`));
}
function renderCreatePostForm() {
    renderPostForm();
}
function makeFavicon(url, big = false) {
    // Utiliser l'API de google pour extraire le favicon du site pointé par url
    // retourne un élément div comportant le favicon en tant qu'image de fond
    ///////////////////////////////////////////////////////////////////////////
    if (url.slice(-1) != "/") url += "/";
    let faviconClass = "favicon";
    if (big) faviconClass = "big-favicon";
    url = "http://www.google.com/s2/favicons?sz=64&domain=" + url;
    return `<div class="${faviconClass}" style="background-image: url('${url}');"></div>`;
}
function renderPostForm(Post = null) {
    hidePosts();
    console.log(Post);
    let create = Post == null;
    if (create){
        Post = newPost();
        Post.Image = "images/no-avatar.png";
    }
    else
        favicon = makeFavicon(Post.Image, true);
    $("#actionTitle").text(create ? "Création" : "Modification");
    $("#PostForm").show();
    $("#PostForm").empty();
    $("#PostForm").append(`
        <form class="form" id="postForm">
            <br>
            <input type="hidden" name="Id" value="${Post.Id}"/>

            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control Alpha"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${Post.Title}"
            />
            <label class="form-label">Image </label>
            <div   class='imageUploader' 
                   newImage='${create}' 
                   controlId='Image' 
                   imageSrc='${Post.Image}' 
                   waitingImage="Loading_icon.gif">
            </div>
            <label for="Text" class="form-label">Texte </label>
            <textarea class="form-control Alpha" name="Text" id="Text" placeholder="Texte" required>${Post.Text}</textarea>
            
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${Post.Category}"
            />
            <br>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </form>
    `);
    initImageUploaders();
    initFormValidation();
    
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        result = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            showPosts();
            await pageManager.update(false);
            compileCategories();
            pageManager.scrollToElem(post.Id);
            renderPosts();
        }
        else
            renderError("Une erreur est survenue!");
    });
    $('#cancel').on("click", function () {
        showPosts();
    });
}
function convertToFrenchDate(numeric_date) {
    date = new Date(numeric_date);
    var options = { year: 'numeric', month: 'long', day: 'numeric' };
    var opt_weekday = { weekday: 'long' };
    var weekday = toTitleCase(date.toLocaleDateString("fr-FR", opt_weekday));

    function toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
        );
    }
    return weekday + " le " + date.toLocaleDateString("fr-FR", options) + " @ " + date.toLocaleTimeString("fr-FR");
}
async function renderDeletePostForm(id) {
    hidePosts();
    $("#actionTitle").text("Retrait");
    $('#PostForm').show();
    $('#PostForm').empty();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;
        
        if (post !== null) {
            $("#PostForm").append(`
        <div class="PostdeleteForm">
            <h4>Effacer le Post suivant?</h4>
            <br>
            <div class="PostRow" id=${post.Id}">
                <div class="PostContainer noselect">
                    <div class="PostLayout">
                        <div class="Post">
                            <span class="PostTitle">${post.Title}</span>
                        </div>
                        <span class="PostCategory">${post.Category}</span>
                        <div class="avatar" style="background-image:url('${post.Image}')"></div>
                        
                    </div>
                </div>
            </div>   
            <br>
            <input type="button" value="Effacer" id="deletePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </div>    
        `);
            $('#deletePost').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    showPosts();
                    await pageManager.update(false);
                    compileCategories();
                }
                else {
                    console.log(Posts_API.currentHttpError)
                    renderError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", function () {
                showPosts();
            });

        } else {
            renderError("Post introuvable!");
        }
    } else
        renderError(Posts_API.currentHttpError);
}