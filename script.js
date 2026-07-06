// =============================================
// COMPLETE JAVASCRIPT - FULL IMPLEMENTATION
// =============================================
(function() {
  // ---------- CONFIG ----------
  const SUPABASE_URL = 'https://pdrfhjbehihehbadoaty.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkcmZoamJlaGloZWhiYWRvYXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNzgyNTEsImV4cCI6MjA5ODg1NDI1MX0.j541e7W56nVCESK_nsVUsGjAv2mOHGb27wwACJZKlBE';

  let supabase;
  try {
    if (typeof window.supabase !== 'undefined') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
      supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    console.log('✅ Supabase initialized');
  } catch(e) {
    console.error('Supabase init error:', e);
  }

  // ---------- STATE ----------
  let currentUser = null;
  let allPosts = [];
  let currentFilter = 'following';
  let profileUserId = null;
  let selectedPostType = 'text';
  let uploadedFileDataURL = null;
  let editingPostId = null;
  let quill = null;
  let qrCodeInstance = null;
  let currentQRData = null;
  let allUsers = [];
  let searchTimeout = null;
  let followingCache = [];
  let reactionData = {};

  // ---------- REACTION EMOJIS ----------
  const REACTION_EMOJIS = { like: '👍', heart: '❤️', funny: '😂', wow: '😮', sad: '😢' };

  // ---------- DOM REFS ----------
  const $ = (id) => document.getElementById(id);
  const authModal = $('authModal');
  const authTitle = $('authTitle');
  const authUsername = $('authUsername');
  const authEmail = $('authEmail');
  const authPassword = $('authPassword');
  const authSubmitBtn = $('authSubmitBtn');
  const authSwitch = $('authSwitch');
  const authError = $('authError');
  const authBtn = $('authBtn');
  const logoutBtn = $('logoutBtn');
  const userDisplay = $('userDisplay');
  const userAvatarDisplay = $('userAvatarDisplay');
  const userNameDisplay = $('userNameDisplay');

  const mainFeed = $('mainFeed');
  const profilePage = $('profilePage');
  const createPostToggle = $('createPostToggle');
  const createArea = $('createPostArea');
  const postTitleInput = $('postTitleInput');
  const createBtn = $('createPostBtn');
  const clearBtn = $('clearPostBtn');
  const fileInput = $('fileInput');
  const filePreview = $('filePreview');
  const fileUploadWrapper = $('fileUploadWrapper');
  const spotifyWrapper = $('spotifyWrapper');
  const spotifyInput = $('spotifyInput');
  const postOptionBtns = document.querySelectorAll('.post-option-btn');
  const postsFeed = $('postsFeed');
  const feedNavBtns = document.querySelectorAll('.feed-nav-btn');

  const searchInput = $('searchInput');
  const searchBtn = $('searchBtn');
  const searchResults = $('searchResults');
  const searchResultsList = $('searchResultsList');

  const settingsModal = $('settingsModal');
  const settingsBtn = $('settingsBtn');
  const closeSettingsModal = $('closeSettingsModal');
  const settingsThemeGrid = $('settingsThemeGrid');

  const qrModal = $('qrModal');
  const qrContainer = $('qrContainer');
  const qrLabel = $('qrLabel');
  const closeQRModal = $('closeQRModal');
  const downloadQRBtn = $('downloadQRBtn');

  const profilePageAvatar = $('profilePageAvatar');
  const profilePageUsername = $('profilePageUsername');
  const profilePageBio = $('profilePageBio');
  const profilePagePostCount = $('profilePagePostCount');
  const profilePageFollowersCount = $('profilePageFollowersCount');
  const profilePageFollowingCount = $('profilePageFollowingCount');
  const profilePageFollowBtn = $('profilePageFollowBtn');
  const profilePageQRBtn = $('profilePageQRBtn');
  const profilePageEditBtn = $('profilePageEditBtn');
  const profilePageFeed = $('profilePageFeed');

  const syncStatus = $('syncStatus');
  const suggestionsBox = $('suggestionsBox');
  const suggestionsList = $('suggestionsList');

  const userListModal = $('userListModal');
  const closeUserListModal = $('closeUserListModal');
  const userListTitle = $('userListTitle');
  const userListItems = $('userListItems');

  const reactionUsersModal = $('reactionUsersModal');
  const closeReactionUsersModal = $('closeReactionUsersModal');
  const reactionUsersTitle = $('reactionUsersTitle');
  const reactionUsersList = $('reactionUsersList');

  // ---------- QUILL ----------
  function initQuill() {
    if (quill) return;
    quill = new Quill('#quillEditor', {
      theme: 'snow',
      placeholder: "What's on your mind?",
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'color': [] }, { 'background': [] }],
          ['link', 'image', 'video'],
          ['clean']
        ]
      }
    });
  }
  initQuill();

  // ---------- NAVIGATION ----------
  window.goHome = function() {
    profilePage.classList.remove('show');
    mainFeed.classList.remove('hidden');
    profileUserId = null;
    filterPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.viewMyProfile = function() {
    if (currentUser) {
      showProfilePage(currentUser.id);
    }
  };

  // ---------- CREATE POST TOGGLE ----------
  createPostToggle.addEventListener('click', function() {
    createArea.classList.toggle('show');
    createPostToggle.innerHTML = createArea.classList.contains('show') ? 
      '<i class="fas fa-times"></i> Close' : 
      '<i class="fas fa-pen-fancy"></i> Create a new post';
  });

  // ---------- AUTH ----------
  let isLoginMode = true;

  authSwitch.addEventListener('click', function() {
    isLoginMode = !isLoginMode;
    authTitle.innerHTML = isLoginMode ? '<i class="fas fa-user"></i> Login' : '<i class="fas fa-user-plus"></i> Sign Up';
    authSubmitBtn.innerHTML = isLoginMode ? '<i class="fas fa-sign-in-alt"></i> Login' : '<i class="fas fa-user-plus"></i> Sign Up';
    authSwitch.textContent = isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Login";
    authEmail.style.display = isLoginMode ? 'none' : 'block';
    authError.textContent = '';
  });

  authSubmitBtn.addEventListener('click', async function() {
    const username = authUsername.value.trim();
    const email = isLoginMode ? '' : authEmail.value.trim();
    const password = authPassword.value;
    
    if (!username || !password) { authError.textContent = 'Please fill in all fields.'; return; }
    if (!isLoginMode && !email) { authError.textContent = 'Email is required for signup.'; return; }
    
    authError.textContent = '';
    
    try {
      if (isLoginMode) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .eq('password_hash', password)
          .single();
        
        if (error || !data) { throw new Error('Invalid username or password'); }
        
        currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(data));
        hideAuthModal();
        updateUI();
        await loadAllData();
      } else {
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .maybeSingle();
        
        if (existing) { throw new Error('Username already taken'); }
        
        const { data, error } = await supabase
          .from('users')
          .insert([{
            username: username,
            email: email,
            password_hash: password,
            avatar_url: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username) + '&background=3b82f6&color=fff&size=128'
          }])
          .select()
          .single();
        
        if (error) throw new Error(error.message);
        
        currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(data));
        hideAuthModal();
        updateUI();
        await loadAllData();
      }
    } catch (error) {
      authError.textContent = error.message || 'Authentication failed';
    }
  });

  authBtn.addEventListener('click', function() { authModal.classList.add('show'); });
  logoutBtn.addEventListener('click', logout);

  function showAuthModal() {
    authModal.classList.add('show');
    authUsername.value = '';
    authPassword.value = '';
    authEmail.value = '';
    authError.textContent = '';
    setTimeout(function() { authUsername.focus(); }, 100);
  }

  function hideAuthModal() { authModal.classList.remove('show'); }

  authModal.addEventListener('click', function(e) {
    if (e.target === authModal) hideAuthModal();
  });

  authUsername.addEventListener('keydown', function(e) { if (e.key === 'Enter') authSubmitBtn.click(); });
  authPassword.addEventListener('keydown', function(e) { if (e.key === 'Enter') authSubmitBtn.click(); });

  function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    followingCache = [];
    updateUI();
    allPosts = [];
    renderPosts();
    goHome();
  }

  function updateUI() {
    if (currentUser) {
      authBtn.style.display = 'none';
      logoutBtn.style.display = 'inline-flex';
      userDisplay.style.display = 'flex';
      userAvatarDisplay.src = currentUser.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.username) + '&background=3b82f6&color=fff&size=128';
      userNameDisplay.textContent = currentUser.username;
      createPostToggle.style.display = 'flex';
    } else {
      authBtn.style.display = 'inline-flex';
      logoutBtn.style.display = 'none';
      userDisplay.style.display = 'none';
      createArea.classList.remove('show');
      createPostToggle.style.display = 'none';
    }
  }

  // ---------- FOLLOWING CACHE ----------
  function updateFollowingCache() {
    if (!currentUser) return;
    supabase.from('followers')
      .select('following_id')
      .eq('follower_id', currentUser.id)
      .then(function(result) {
        followingCache = (result.data || []).map(function(f) { return f.following_id; });
      });
  }

  // ---------- LOAD ALL DATA ----------
  async function loadAllData() {
    await loadUsers();
    await loadPosts();
    await loadSuggestions();
  }

  async function loadUsers() {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      allUsers = data || [];
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  // ---------- SEARCH ----------
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const query = this.value.trim();
    
    if (query.length === 0) {
      searchResults.classList.remove('show');
      return;
    }
    
    if (query.length < 2) {
      searchResultsList.innerHTML = '<div style="padding:0.5rem;text-align:center;opacity:0.4;">Type at least 2 characters...</div>';
      searchResults.classList.add('show');
      return;
    }
    
    searchTimeout = setTimeout(function() {
      performSearch(query);
    }, 300);
  });

  searchBtn.addEventListener('click', function() {
    const query = searchInput.value.trim();
    if (query) performSearch(query);
  });

  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = this.value.trim();
      if (query) performSearch(query);
    }
  });

  function performSearch(query) {
    if (!query || query.length < 2) {
      searchResults.classList.remove('show');
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const results = allUsers.filter(function(u) {
      return u.username.toLowerCase().includes(lowerQuery) && u.id !== currentUser?.id;
    });
    
    if (results.length === 0) {
      searchResultsList.innerHTML = '<div style="padding:0.8rem;text-align:center;opacity:0.5;"><i class="fas fa-search"></i> No users found matching "' + query + '"</div>';
    } else {
      searchResultsList.innerHTML = results.map(function(u) {
        var avatar = u.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.username) + '&background=3b82f6&color=fff&size=64';
        var isFollow = currentUser ? followingCache.includes(u.id) : false;
        var highlighted = u.username.replace(new RegExp(query, 'gi'), function(match) {
          return '<strong style="color:#3b82f6;">' + match + '</strong>';
        });
        return '<div class="search-result-item">' +
          '<div class="search-result-user" onclick="showProfilePage(\'' + u.id + '\')">' +
          '<img class="search-result-avatar" src="' + avatar + '" alt="' + u.username + '">' +
          '<span class="search-result-username">' + highlighted + '</span>' +
          '</div>' +
          (currentUser && currentUser.id !== u.id ? '<button class="btn ' + (isFollow ? 'btn-unfollow' : 'btn-follow') + ' btn-sm" onclick="event.stopPropagation(); toggleFollow(\'' + u.id + '\')"><i class="fas ' + (isFollow ? 'fa-user-minus' : 'fa-user-plus') + '"></i></button>' : '') +
          '</div>';
      }).join('');
    }
    
    searchResults.classList.add('show');
  }

  document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target) && e.target !== searchBtn) {
      searchResults.classList.remove('show');
    }
  });

  // ---------- TOGGLE FOLLOW ----------
  window.toggleFollow = async function(userId) {
    if (!currentUser) { showAuthModal(); return; }
    if (userId === currentUser.id) return;
    
    try {
      const { data: existing } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .maybeSingle();
      
      if (existing) {
        await supabase.from('followers').delete().eq('id', existing.id);
        followingCache = followingCache.filter(function(id) { return id !== userId; });
      } else {
        await supabase.from('followers').insert([{
          follower_id: currentUser.id,
          following_id: userId
        }]);
        followingCache.push(userId);
      }
      
      await loadSuggestions();
      filterPosts();
      if (profileUserId === userId || profileUserId === currentUser.id) {
        await showProfilePage(userId);
      }
      if (searchResults.classList.contains('show')) {
        performSearch(searchInput.value.trim());
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // ---------- SHOW PROFILE PAGE ----------
  window.showProfilePage = async function(userId) {
    if (!userId) return;
    profileUserId = userId;
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      profilePageAvatar.src = user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=3b82f6&color=fff&size=128';
      profilePageUsername.textContent = user.username;
      profilePageBio.textContent = user.bio || 'No bio yet';
      
      const { count: postCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .eq('author_id', userId);
      profilePagePostCount.textContent = postCount || 0;
      
      const { count: followersCount } = await supabase
        .from('followers')
        .select('id', { count: 'exact' })
        .eq('following_id', userId);
      profilePageFollowersCount.textContent = followersCount || 0;
      
      const { count: followingCount } = await supabase
        .from('followers')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId);
      profilePageFollowingCount.textContent = followingCount || 0;
      
      const isOwn = currentUser && currentUser.id === userId;
      const isFollow = followingCache.includes(userId);
      
      if (isOwn) {
        profilePageFollowBtn.innerHTML = '';
      } else {
        profilePageFollowBtn.innerHTML = '<button class="btn ' + (isFollow ? 'btn-unfollow' : 'btn-follow') + '" onclick="toggleFollow(\'' + userId + '\')"><i class="fas ' + (isFollow ? 'fa-user-minus' : 'fa-user-plus') + '"></i> ' + (isFollow ? 'Unfollow' : 'Follow') + '</button>';
      }
      
      profilePageEditBtn.style.display = isOwn ? 'inline-flex' : 'none';
      
      mainFeed.classList.add('hidden');
      profilePage.classList.add('show');
      
      const userPosts = allPosts.filter(function(p) { return p.author_id === userId; });
      renderProfilePosts(userPosts);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error) {
      alert('Error loading profile: ' + error.message);
    }
  };

  // ---------- RENDER PROFILE POSTS ----------
  function renderProfilePosts(posts) {
    if (!profilePageFeed) return;
    
    if (posts.length === 0) {
      profilePageFeed.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No posts yet</p></div>';
      return;
    }
    
    let html = '';
    posts.forEach(function(post) {
      const isAuthor = currentUser && post.author_id === currentUser.id;
      const authorName = post.users?.username || 'Unknown';
      const authorAvatar = post.users?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(authorName) + '&background=3b82f6&color=fff&size=64';
      
      html += '<div class="post-item ' + (post.is_pinned ? 'pinned' : '') + '" id="profile-post-' + post.id + '">';
      html += '<div class="post-header">';
      html += '<div>';
      html += '<div class="post-author" onclick="showProfilePage(\'' + post.author_id + '\')">';
      html += '<img class="post-author-avatar" src="' + authorAvatar + '" alt="' + authorName + '">';
      html += '<span class="post-author-name">' + authorName + '</span>';
      if (post.is_pinned) html += '<span class="pinned-badge"><i class="fas fa-thumbtack"></i> Pinned</span>';
      html += '</div>';
      if (post.title) html += '<div class="post-title">' + post.title + '</div>';
      html += '</div>';
      html += '<div class="post-meta">' + new Date(post.created_at).toLocaleString() + (post.updated_at !== post.created_at ? ' (edited)' : '') + '</div>';
      html += '</div>';
      html += '<div class="post-content">' + post.content_html + '</div>';
      if (post.media_data) html += renderMedia(post);
      
      // Reactions
      html += '<div class="post-reactions" id="profile-reactions-' + post.id + '"><span style="font-size:0.8rem;opacity:0.5;">Loading reactions...</span></div>';
      
      // Comments section - HIDDEN by default
      html += '<div class="comments-section" id="profile-comments-' + post.id + '" style="display:none;">';
      html += '<div id="profile-commentsList-' + post.id + '"></div>';
      if (currentUser) {
        html += '<div class="comment-input-wrapper">';
        html += '<input type="text" id="profile-commentInput-' + post.id + '" placeholder="Write a comment...">';
        html += '<button class="btn btn-primary btn-sm" onclick="addComment(\'' + post.id + '\', \'profile-\')"><i class="fas fa-paper-plane"></i></button>';
        html += '</div>';
      }
      html += '</div>';
      
      // Post Actions
      html += '<div class="post-actions">';
      html += '<button class="btn btn-outline" onclick="toggleComments(\'' + post.id + '\', \'profile-\')"><i class="fas fa-comment"></i> Comments <span id="profile-commentCount-' + post.id + '" style="font-size:0.7rem;opacity:0.6;"></span></button>';
      if (isAuthor) {
        html += '<button class="btn btn-outline" onclick="editPost(' + post.id + ')"><i class="fas fa-edit"></i> Edit</button>';
        html += '<button class="btn btn-danger" onclick="deletePost(' + post.id + ')"><i class="fas fa-trash"></i> Delete</button>';
      }
      html += '<button class="btn btn-outline" onclick="showQR(\'post\', ' + post.id + ', \'' + encodeURIComponent(post.title || 'Post') + '\')"><i class="fas fa-qrcode"></i> QR</button>';
      html += '<button class="btn btn-outline" onclick="sharePost(' + post.id + ')"><i class="fas fa-share-alt"></i> Share</button>';
      html += '<button class="btn btn-outline" onclick="viewHistory(' + post.id + ')"><i class="fas fa-history"></i> History</button>';
      html += '</div>';
      html += '</div>';
    });
    
    profilePageFeed.innerHTML = html;
    
    posts.forEach(function(post) {
      loadComments(post.id, 'profile-');
      loadReactions(post.id, 'profile-');
      updateCommentCount(post.id, 'profile-');
    });
  }

  // ---------- PROFILE EDIT ----------
  profilePageEditBtn.addEventListener('click', function() {
    const newBio = prompt('Edit your bio:', currentUser?.bio || '');
    if (newBio !== null && currentUser) {
      supabase.from('users')
        .update({ bio: newBio })
        .eq('id', currentUser.id)
        .then(function() {
          currentUser.bio = newBio;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          showProfilePage(currentUser.id);
        });
    }
  });

  profilePageQRBtn.addEventListener('click', function() {
    if (profileUserId) {
      const user = allUsers.find(function(u) { return u.id === profileUserId; });
      showQR('profile', profileUserId, (user?.username || 'User') + "'s profile");
    }
  });

  // ---------- REACTIONS ----------
  window.toggleReaction = async function(postId, reactionType, prefix) {
    if (!currentUser) { showAuthModal(); return; }
    
    try {
      const { data: existing } = await supabase
        .from('post_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .eq('reaction_type', reactionType)
        .maybeSingle();
      
      if (existing) {
        await supabase.from('post_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('post_reactions').insert([{
          post_id: postId,
          user_id: currentUser.id,
          reaction_type: reactionType
        }]);
      }
      
      loadReactions(postId, prefix || '');
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  async function loadReactions(postId, prefix) {
    const idPrefix = prefix || '';
    try {
      const { data, error } = await supabase
        .from('post_reactions')
        .select('reaction_type, user_id, users!post_reactions_user_id_fkey (id, username, avatar_url)')
        .eq('post_id', postId);
      
      if (error) throw error;
      
      const container = document.getElementById(idPrefix + 'reactions-' + postId);
      if (!container) return;
      
      const counts = {};
      data.forEach(function(r) { counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1; });
      
      const userReactions = data.filter(function(r) { return currentUser && r.user_id === currentUser.id; }).map(function(r) { return r.reaction_type; });
      
      let html = '';
      for (const key in REACTION_EMOJIS) {
        const emoji = REACTION_EMOJIS[key];
        const active = userReactions.includes(key) ? 'active' : '';
        const count = counts[key] || 0;
        html += '<button class="reaction-btn ' + active + '" onclick="toggleReaction(' + postId + ', \'' + key + '\', \'' + idPrefix + '\')">';
        html += emoji + ' <span class="reaction-count" onclick="event.stopPropagation(); showReactionUsers(' + postId + ', \'' + key + '\')">' + count + '</span>';
        html += '</button>';
      }
      container.innerHTML = html;
      
      reactionData[postId] = data;
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  }

  window.showReactionUsers = function(postId, type) {
    const data = reactionData[postId];
    if (!data) { alert('No reactions yet.'); return; }
    
    const users = data.filter(function(r) { return r.reaction_type === type; });
    if (users.length === 0) {
      alert('No one has reacted with ' + REACTION_EMOJIS[type] + ' yet.');
      return;
    }
    
    reactionUsersTitle.innerHTML = '<i class="fas fa-reactions"></i> ' + REACTION_EMOJIS[type] + ' - ' + users.length + ' ' + (users.length === 1 ? 'person' : 'people');
    
    reactionUsersList.innerHTML = users.map(function(r) {
      const user = r.users;
      if (!user) return '';
      const avatar = user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=3b82f6&color=fff&size=64';
      return '<div class="reaction-user-item">' +
        '<div class="reaction-user-item" onclick="showProfilePage(\'' + user.id + '\'); reactionUsersModal.classList.remove(\'show\');">' +
        '<img class="reaction-user-avatar" src="' + avatar + '" alt="' + user.username + '">' +
        '<span class="reaction-user-username">' + user.username + '</span>' +
        '</div></div>';
    }).join('');
    
    reactionUsersModal.classList.add('show');
  };

  closeReactionUsersModal.addEventListener('click', function() { reactionUsersModal.classList.remove('show'); });
  reactionUsersModal.addEventListener('click', function(e) {
    if (e.target === reactionUsersModal) reactionUsersModal.classList.remove('show');
  });

  // ---------- COMMENTS ----------
  window.addComment = async function(postId, prefix) {
    if (!currentUser) { showAuthModal(); return; }
    const idPrefix = prefix || '';
    const input = document.getElementById(idPrefix + 'commentInput-' + postId);
    const content = input.value.trim();
    if (!content) return;
    
    try {
      await supabase.from('comments').insert([{
        post_id: postId,
        user_id: currentUser.id,
        content: content
      }]);
      
      input.value = '';
      await loadComments(postId, idPrefix);
      // Make sure comments section is visible after adding
      const commentsSection = document.getElementById(idPrefix + 'comments-' + postId);
      if (commentsSection) commentsSection.style.display = 'block';
      
    } catch (error) {
      alert('Error adding comment: ' + error.message);
    }
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.id && (e.target.id.startsWith('commentInput-') || e.target.id.startsWith('profile-commentInput-'))) {
      const id = e.target.id.replace('commentInput-', '').replace('profile-commentInput-', '');
      const prefix = e.target.id.startsWith('profile-') ? 'profile-' : '';
      addComment(parseInt(id), prefix);
    }
  });

  window.deleteComment = async function(commentId, postId, prefix) {
    if (!confirm('Delete this comment?')) return;
    try {
      await supabase.from('comments').delete().eq('id', commentId);
      loadComments(postId, prefix || '');
    } catch (error) {
      alert('Error deleting comment: ' + error.message);
    }
  };

  async function loadComments(postId, prefix) {
    const idPrefix = prefix || '';
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, users!comments_user_id_fkey (id, username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const container = document.getElementById(idPrefix + 'commentsList-' + postId);
      if (!container) return;
      
      if (!data || data.length === 0) {
        container.innerHTML = '<div style="font-size:0.8rem;opacity:0.4;padding:0.5rem 0;">No comments yet</div>';
      } else {
        let html = '';
        data.forEach(function(comment) {
          const author = comment.users?.username || 'Unknown';
          const avatar = comment.users?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author) + '&background=3b82f6&color=fff&size=64';
          html += '<div class="comment-item">';
          html += '<img class="comment-avatar" src="' + avatar + '" alt="' + author + '" onclick="showProfilePage(\'' + comment.user_id + '\')">';
          html += '<div class="comment-body">';
          html += '<div class="comment-author" onclick="showProfilePage(\'' + comment.user_id + '\')">' + author + '</div>';
          html += '<div class="comment-text">' + comment.content + '</div>';
          html += '<div class="comment-time">' + new Date(comment.created_at).toLocaleString() + '</div>';
          if (currentUser && comment.user_id === currentUser.id) {
            html += '<div class="comment-actions"><button class="btn btn-danger btn-sm" onclick="deleteComment(' + comment.id + ', ' + postId + ', \'' + idPrefix + '\')"><i class="fas fa-trash"></i></button></div>';
          }
          html += '</div></div>';
        });
        container.innerHTML = html;
      }
      
      // Update comment count
      updateCommentCount(postId, idPrefix);
      
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  // ---------- TOGGLE COMMENTS ----------
  window.toggleComments = function(postId, prefix) {
    const idPrefix = prefix || '';
    const commentsSection = document.getElementById(idPrefix + 'comments-' + postId);
    
    if (!commentsSection) return;
    
    // Toggle visibility
    if (commentsSection.style.display === 'none') {
      commentsSection.style.display = 'block';
      // Load comments if not loaded yet
      loadComments(postId, idPrefix);
    } else {
      commentsSection.style.display = 'none';
    }
  };

  // ---------- UPDATE COMMENT COUNT ----------
  function updateCommentCount(postId, prefix) {
    const idPrefix = prefix || '';
    const countSpan = document.getElementById(idPrefix + 'commentCount-' + postId);
    if (!countSpan) return;
    
    // Count comments from the comments list
    const commentsList = document.getElementById(idPrefix + 'commentsList-' + postId);
    if (commentsList) {
      const commentItems = commentsList.querySelectorAll('.comment-item');
      const count = commentItems.length;
      countSpan.textContent = count > 0 ? '(' + count + ')' : '';
    }
  }

  // ---------- SUGGESTIONS ----------
  async function loadSuggestions() {
    if (!currentUser) {
      suggestionsBox.style.display = 'none';
      return;
    }
    
    try {
      const suggestions = allUsers
        .filter(function(u) { return u.id !== currentUser.id && !followingCache.includes(u.id); })
        .slice(0, 5);
      
      if (suggestions.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
      }
      
      suggestionsBox.style.display = 'block';
      let html = '';
      suggestions.forEach(function(user) {
        const avatar = user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=3b82f6&color=fff&size=64';
        html += '<div class="suggestion-item">';
        html += '<div class="suggestion-user" onclick="showProfilePage(\'' + user.id + '\')">';
        html += '<img class="suggestion-avatar" src="' + avatar + '" alt="' + user.username + '">';
        html += '<span class="suggestion-username">' + user.username + '</span>';
        html += '</div>';
        html += '<button class="btn btn-follow btn-sm" onclick="toggleFollow(\'' + user.id + '\')"><i class="fas fa-user-plus"></i> Follow</button>';
        html += '</div>';
      });
      suggestionsList.innerHTML = html;
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  }

  // ---------- USER LIST ----------
  window.showUserList = async function(type) {
    const userId = profileUserId || currentUser?.id;
    if (!userId) return;
    
    const title = type === 'followers' ? 'Followers' : 'Following';
    userListTitle.innerHTML = '<i class="fas fa-users"></i> ' + title;
    userListItems.innerHTML = '<div style="text-align:center;padding:1rem;opacity:0.5;">Loading...</div>';
    userListModal.classList.add('show');
    
    try {
      let query = supabase
        .from('followers')
        .select(`
          id,
          users!followers_follower_id_fkey (id, username, avatar_url),
          users!followers_following_id_fkey (id, username, avatar_url)
        `);
      
      if (type === 'followers') {
        query = query.eq('following_id', userId);
      } else {
        query = query.eq('follower_id', userId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) {
        userListItems.innerHTML = '<div style="text-align:center;padding:1rem;opacity:0.5;">No ' + type + ' yet</div>';
        return;
      }
      
      let html = '';
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const user = type === 'followers' ? item.users_followers_follower_id_fkey : item.users_followers_following_id_fkey;
        if (!user) continue;
        const avatar = user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=3b82f6&color=fff&size=64';
        const isFollow = followingCache.includes(user.id);
        html += '<div class="user-list-item">';
        html += '<div class="user-list-user" onclick="showProfilePage(\'' + user.id + '\'); userListModal.classList.remove(\'show\');">';
        html += '<img class="user-list-avatar" src="' + avatar + '" alt="' + user.username + '">';
        html += '<span class="user-list-username">' + user.username + '</span>';
        html += '</div>';
        if (currentUser && currentUser.id !== user.id) {
          html += '<button class="btn ' + (isFollow ? 'btn-unfollow' : 'btn-follow') + ' btn-sm" onclick="toggleFollow(\'' + user.id + '\')"><i class="fas ' + (isFollow ? 'fa-user-minus' : 'fa-user-plus') + '"></i></button>';
        }
        html += '</div>';
      }
      userListItems.innerHTML = html;
    } catch (error) {
      userListItems.innerHTML = '<div style="text-align:center;padding:1rem;color:#f87171;">Error loading users</div>';
    }
  };

  closeUserListModal.addEventListener('click', function() { userListModal.classList.remove('show'); });
  userListModal.addEventListener('click', function(e) {
    if (e.target === userListModal) userListModal.classList.remove('show');
  });

  // ---------- LOAD POSTS ----------
  async function loadPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, users!posts_author_id_fkey (id, username, avatar_url)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      allPosts = data || [];
      
      if (profilePage.classList.contains('show') && profileUserId) {
        const userPosts = allPosts.filter(function(p) { return p.author_id === profileUserId; });
        renderProfilePosts(userPosts);
      }
      
      filterPosts();
      updateSyncStatus('Synced');
    } catch (error) {
      console.error('Error loading posts:', error);
      updateSyncStatus('Error');
      allPosts = [];
      renderPosts();
    }
  }

  // ---------- FILTER POSTS ----------
  function filterPosts() {
    let filtered = [...allPosts];
    
    if (currentFilter === 'my' && currentUser) {
      filtered = filtered.filter(function(p) { return p.author_id === currentUser.id; });
    } else if (currentFilter === 'following' && currentUser) {
      if (followingCache.length === 0) {
        renderFilteredPosts(filtered);
        return;
      }
      filtered = filtered.filter(function(p) {
        return followingCache.includes(p.author_id) || p.author_id === currentUser.id;
      });
    }
    
    renderFilteredPosts(filtered);
  }

  function renderFilteredPosts(posts) {
    posts.sort(function(a, b) {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    renderPosts(posts);
  }

  // ---------- FEED NAV ----------
  feedNavBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      feedNavBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      filterPosts();
    });
  });

  // ---------- RENDER POSTS ----------
  function renderPosts(postsToRender) {
    const posts = postsToRender || allPosts;
    
    if (!postsFeed) return;
    
    if (posts.length === 0) {
      postsFeed.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>' + 
        (currentFilter === 'my' ? "You haven't posted anything yet." : 
         currentFilter === 'following' ? "No posts from people you follow. Try the Global feed!" :
         "No posts yet. Be the first to create one!") + 
        '</p></div>';
      return;
    }
    
    let html = '';
    posts.forEach(function(post) {
      const isAuthor = currentUser && post.author_id === currentUser.id;
      const authorName = post.users?.username || 'Unknown';
      const authorAvatar = post.users?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(authorName) + '&background=3b82f6&color=fff&size=64';
      
      html += '<div class="post-item ' + (post.is_pinned ? 'pinned' : '') + '" id="post-' + post.id + '">';
      html += '<div class="post-header">';
      html += '<div>';
      html += '<div class="post-author" onclick="showProfilePage(\'' + post.author_id + '\')">';
      html += '<img class="post-author-avatar" src="' + authorAvatar + '" alt="' + authorName + '">';
      html += '<span class="post-author-name">' + authorName + '</span>';
      if (post.is_pinned) html += '<span class="pinned-badge"><i class="fas fa-thumbtack"></i> Pinned</span>';
      html += '</div>';
      if (post.title) html += '<div class="post-title">' + post.title + '</div>';
      html += '</div>';
      html += '<div class="post-meta">' + new Date(post.created_at).toLocaleString() + (post.updated_at !== post.created_at ? ' (edited)' : '') + '</div>';
      html += '</div>';
      html += '<div class="post-content">' + post.content_html + '</div>';
      if (post.media_data) html += renderMedia(post);
      
      // Reactions
      html += '<div class="post-reactions" id="reactions-' + post.id + '"><span style="font-size:0.8rem;opacity:0.5;">Loading reactions...</span></div>';
      
      // Comments section - HIDDEN by default
      html += '<div class="comments-section" id="comments-' + post.id + '" style="display:none;">';
      html += '<div id="commentsList-' + post.id + '"></div>';
      if (currentUser) {
        html += '<div class="comment-input-wrapper">';
        html += '<input type="text" id="commentInput-' + post.id + '" placeholder="Write a comment...">';
        html += '<button class="btn btn-primary btn-sm" onclick="addComment(' + post.id + ')"><i class="fas fa-paper-plane"></i></button>';
        html += '</div>';
      }
      html += '</div>';
      
      // Post Actions
      html += '<div class="post-actions">';
      html += '<button class="btn btn-outline" onclick="toggleComments(' + post.id + ')"><i class="fas fa-comment"></i> Comments <span id="commentCount-' + post.id + '" style="font-size:0.7rem;opacity:0.6;"></span></button>';
      if (isAuthor) {
        html += '<button class="btn btn-outline" onclick="editPost(' + post.id + ')"><i class="fas fa-edit"></i> Edit</button>';
        html += '<button class="btn btn-danger" onclick="deletePost(' + post.id + ')"><i class="fas fa-trash"></i> Delete</button>';
      }
      html += '<button class="btn btn-outline" onclick="showQR(\'post\', ' + post.id + ', \'' + encodeURIComponent(post.title || 'Post') + '\')"><i class="fas fa-qrcode"></i> QR</button>';
      html += '<button class="btn btn-outline" onclick="sharePost(' + post.id + ')"><i class="fas fa-share-alt"></i> Share</button>';
      html += '<button class="btn btn-outline" onclick="viewHistory(' + post.id + ')"><i class="fas fa-history"></i> History</button>';
      html += '</div>';
      html += '</div>';
    });
    
    postsFeed.innerHTML = html;
    
    posts.forEach(function(post) {
      loadComments(post.id);
      loadReactions(post.id);
      updateCommentCount(post.id);
    });
  }

  function renderMedia(post) {
    const mediaType = post.media_type || '';
    const mediaData = post.media_data || '';
    
    if (mediaType.includes('image') || mediaType === 'image') {
      return '<img src="' + mediaData + '" alt="Image" loading="lazy" style="max-width:100%;border-radius:16px;margin:0.3rem 0;">';
    } else if (mediaType.includes('gif') || mediaType === 'gif') {
      return '<img src="' + mediaData + '" alt="GIF" loading="lazy" style="max-width:100%;border-radius:16px;margin:0.3rem 0;">';
    } else if (mediaType.includes('spotify') || mediaType === 'spotify') {
      const match = mediaData.match(/spotify\.com\/(track|playlist|episode)\/([a-zA-Z0-9]+)/);
      if (match) {
        return '<iframe src="https://open.spotify.com/embed/' + match[1] + '/' + match[2] + '" allow="encrypted-media" style="width:100%;height:80px;border-radius:16px;border:none;"></iframe>';
      }
      return '<a href="' + mediaData + '" target="_blank">' + mediaData + '</a>';
    }
    return '';
  }

  // ---------- POST OPERATIONS ----------
  window.editPost = function(postId) {
    if (!currentUser) { showAuthModal(); return; }
    
    const post = allPosts.find(function(p) { return p.id === postId; });
    
    if (!post) {
      alert('Post not found. Please refresh and try again.');
      return;
    }
    
    if (post.author_id !== currentUser.id) {
      alert('You can only edit your own posts.');
      return;
    }
    
    editingPostId = postId;
    postTitleInput.value = post.title || '';
    quill.root.innerHTML = post.content_html || '';
    
    createArea.classList.add('show');
    createArea.scrollIntoView({ behavior: 'smooth' });
    createPostToggle.innerHTML = '<i class="fas fa-times"></i> Close';
    
    if (post.media_type) {
      const btn = document.querySelector('.post-option-btn[data-type="' + post.media_type + '"]');
      if (btn) {
        postOptionBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedPostType = post.media_type;
        updatePostTypeUI(selectedPostType);
      }
    }
    
    if (post.media_data) {
      if (post.media_type === 'image' || post.media_type === 'gif') {
        filePreview.src = post.media_data;
        filePreview.classList.add('show');
        uploadedFileDataURL = post.media_data;
      } else if (post.media_type === 'spotify') {
        spotifyInput.value = post.media_data;
      }
    }
  };

  window.deletePost = async function(postId) {
    if (!currentUser) { showAuthModal(); return; }
    
    const post = allPosts.find(function(p) { return p.id === postId; });
    if (!post) {
      alert('Post not found.');
      return;
    }
    
    if (post.author_id !== currentUser.id) {
      alert('You can only delete your own posts.');
      return;
    }
    
    if (!confirm('Delete this post permanently?')) return;
    
    try {
      await supabase.from('posts').delete().eq('id', postId);
      await loadPosts();
    } catch (error) {
      alert('Error deleting post: ' + error.message);
    }
  };

  window.viewHistory = async function(postId) {
    try {
      const { data, error } = await supabase
        .from('post_history')
        .select('*')
        .eq('post_id', postId)
        .order('changed_at', { ascending: false });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert('No history available for this post.');
        return;
      }
      
      let msg = '📜 Post History:\n\n';
      data.forEach(function(h, i) {
        msg += 'Version ' + (data.length - i) + ' (' + new Date(h.changed_at).toLocaleString() + '):\n';
        msg += h.content.substring(0, 200) + (h.content.length > 200 ? '...' : '') + '\n\n';
      });
      alert(msg);
    } catch (error) {
      alert('Error loading history: ' + error.message);
    }
  };

  // ---------- CREATE POST ----------
  createBtn.addEventListener('click', async function() {
    if (!currentUser) { showAuthModal(); return; }
    
    const title = postTitleInput.value.trim();
    const content = quill.root.innerHTML;
    const textContent = quill.getText().trim();
    
    if (!textContent && !uploadedFileDataURL && !spotifyInput.value.trim()) {
      alert('Please add some content to your post.');
      return;
    }
    
    let mediaData = '';
    let mediaType = selectedPostType;
    
    if (uploadedFileDataURL) {
      mediaData = uploadedFileDataURL;
      mediaType = selectedPostType.includes('gif') ? 'gif' : 'image';
    } else if (spotifyInput.value.trim()) {
      mediaData = spotifyInput.value.trim();
      mediaType = 'spotify';
    }
    
    const isPinned = selectedPostType === 'pinned';
    
    const postData = {
      title: title,
      content: textContent,
      content_html: content,
      author_id: currentUser.id,
      timestamp: new Date().toISOString(),
      media_data: mediaData,
      media_type: mediaType,
      is_pinned: isPinned
    };
    
    try {
      if (editingPostId) {
        const { error } = await supabase
          .from('posts')
          .update(Object.assign({}, postData, { updated_at: new Date().toISOString() }))
          .eq('id', editingPostId)
          .eq('author_id', currentUser.id);
        
        if (error) throw error;
        
        await supabase.from('post_history').insert([{
          post_id: editingPostId,
          content: textContent,
          content_html: content
        }]);
        
        editingPostId = null;
      } else {
        const { error } = await supabase.from('posts').insert([postData]);
        if (error) throw error;
      }
      
      clearBtn.click();
      createArea.classList.remove('show');
      createPostToggle.innerHTML = '<i class="fas fa-pen-fancy"></i> Create a new post';
      await loadPosts();
    } catch (error) {
      alert('Error saving post: ' + error.message);
    }
  });

  // ---------- POST TYPE SELECTION ----------
  postOptionBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      postOptionBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      selectedPostType = this.dataset.type;
      updatePostTypeUI(selectedPostType);
    });
  });

  function updatePostTypeUI(type) {
    fileUploadWrapper.style.display = 'none';
    spotifyWrapper.style.display = 'none';
    filePreview.classList.remove('show');
    uploadedFileDataURL = null;
    
    if (type === 'image' || type === 'text-image') {
      fileUploadWrapper.style.display = 'block';
      fileInput.accept = 'image/*';
    } else if (type === 'gif' || type === 'text-gif') {
      fileUploadWrapper.style.display = 'block';
      fileInput.accept = 'image/gif';
    } else if (type === 'spotify' || type === 'text-spotify') {
      spotifyWrapper.style.display = 'flex';
    }
  }

  fileInput.addEventListener('change', function(e) {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        uploadedFileDataURL = event.target.result;
        filePreview.src = event.target.result;
        filePreview.classList.add('show');
      };
      reader.readAsDataURL(file);
    }
  });

  clearBtn.addEventListener('click', function() {
    postTitleInput.value = '';
    quill.setText('');
    fileInput.value = '';
    filePreview.classList.remove('show');
    uploadedFileDataURL = null;
    spotifyInput.value = '';
    editingPostId = null;
  });

  // ---------- SHARING ----------
  window.sharePost = function(postId) {
    const post = allPosts.find(function(p) { return p.id === postId; });
    if (!post) return;
    
    const url = window.location.href + '?post=' + postId;
    const text = post.title || 'Check out this post!';
    
    if (navigator.share) {
      navigator.share({
        title: text,
        text: post.content?.substring(0, 100) || '',
        url: url
      }).catch(function() {});
    } else {
      navigator.clipboard.writeText(url).then(function() {
        alert('🔗 Link copied to clipboard! Share it with others.');
      }).catch(function() {
        prompt('Copy this link:', url);
      });
    }
  };

  // ---------- QR CODE ----------
  window.showQR = function(type, id, label) {
    const url = window.location.href + '?' + type + '=' + id;
    currentQRData = { type: type, id: id, url: url, label: label };
    
    qrContainer.innerHTML = '';
    qrCodeInstance = new QRCode(qrContainer, {
      text: url,
      width: 200,
      height: 200,
      colorDark: '#ffffff',
      colorLight: '#0b0d10',
      correctLevel: QRCode.CorrectLevel.H
    });
    
    qrLabel.textContent = 'Scan to view ' + (label || 'this');
    qrModal.classList.add('show');
  };

  closeQRModal.addEventListener('click', function() { qrModal.classList.remove('show'); });
  qrModal.addEventListener('click', function(e) {
    if (e.target === qrModal) qrModal.classList.remove('show');
  });

  downloadQRBtn.addEventListener('click', function() {
    const canvas = qrContainer.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'qr-' + (currentQRData?.type || 'code') + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  });

  // ---------- SETTINGS ----------
  settingsBtn.addEventListener('click', function() { settingsModal.classList.add('show'); });
  closeSettingsModal.addEventListener('click', function() { settingsModal.classList.remove('show'); });
  settingsModal.addEventListener('click', function(e) {
    if (e.target === settingsModal) settingsModal.classList.remove('show');
  });

  settingsThemeGrid.querySelectorAll('.settings-theme-option').forEach(function(option) {
    option.addEventListener('click', function() {
      const theme = this.dataset.theme;
      document.body.className = theme;
      settingsThemeGrid.querySelectorAll('.settings-theme-option').forEach(function(el) { el.classList.remove('active'); });
      this.classList.add('active');
      localStorage.setItem('selected_theme', theme);
    });
  });

  // ---------- SYNC STATUS ----------
  function updateSyncStatus(status) {
    if (!syncStatus) return;
    const icons = { Synced: 'fa-check-circle', Loading: 'fa-spinner fa-spin', Error: 'fa-exclamation-circle' };
    syncStatus.innerHTML = '<i class="fas ' + (icons[status] || 'fa-circle') + '"></i> ' + status;
  }

  // ---------- INIT ----------
  function init() {
    const savedTheme = localStorage.getItem('selected_theme') || 'dark';
    document.body.className = savedTheme;
    const activeOption = settingsThemeGrid.querySelector('.settings-theme-option[data-theme="' + savedTheme + '"]');
    if (activeOption) activeOption.classList.add('active');

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        updateUI();
        updateFollowingCache();
        loadAllData();
      } catch(e) { localStorage.removeItem('currentUser'); }
    } else {
      updateUI();
      loadAllData();
    }

    document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || (e.ctrlKey && e.key === 'U')) {
        e.preventDefault(); return false;
      }
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); return false; }
    });

    console.log('🚀 Secret Social Network Loaded');
    console.log('🔍 Search: Type to see autocomplete suggestions');
    console.log('👥 Click on search results or avatars to view full profile page');
    console.log('❤️ Click on reaction counts to see who reacted');
  }

  init();
})();
