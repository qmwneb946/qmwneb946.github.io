document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const siteCards = document.querySelectorAll('.site-card');
    const categories = document.querySelectorAll('.category');
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const searchBox = document.querySelector('.search-box');
    const searchResultsPage = document.getElementById('search-results');
    const searchSections = searchResultsPage.querySelectorAll('.search-section');
    
    // 移动端元素
    const menuToggle = document.querySelector('.menu-toggle');
    const searchToggle = document.querySelector('.search-toggle');
    const sidebar = document.querySelector('.sidebar');
    const searchContainer = document.querySelector('.search-container');
    const overlay = document.querySelector('.overlay');
    
    let isSearchActive = false;
    let currentPageId = 'home';
    let isInitialLoad = true;
    let isSidebarOpen = false;
    let isSearchOpen = false;
    
    // 搜索索引，用于提高搜索效率
    let searchIndex = {
        initialized: false,
        items: []
    };
    
    // 初始化搜索索引
    function initSearchIndex() {
        if (searchIndex.initialized) return;
        
        searchIndex.items = [];
        
        try {
            // 为每个页面创建索引
            pages.forEach(page => {
                if (page.id === 'search-results') return;
                
                const pageId = page.id;
                
                page.querySelectorAll('.site-card').forEach(card => {
                    try {
                        const title = card.querySelector('h3')?.textContent?.toLowerCase() || '';
                        const description = card.querySelector('p')?.textContent?.toLowerCase() || '';
                        const url = card.href || card.getAttribute('href') || '#';
                        const icon = card.querySelector('i')?.className || '';
                        
                        // 将卡片信息添加到索引中
                        searchIndex.items.push({
                            pageId,
                            title,
                            description,
                            url,
                            icon,
                            element: card,
                            // 预先计算搜索文本，提高搜索效率
                            searchText: (title + ' ' + description).toLowerCase()
                        });
                    } catch (cardError) {
                        console.error('Error processing card:', cardError);
                    }
                });
            });
            
            searchIndex.initialized = true;
            console.log('Search index initialized with', searchIndex.items.length, 'items');
        } catch (error) {
            console.error('Error initializing search index:', error);
            searchIndex.initialized = true; // 防止反复尝试初始化
        }
    }

    // 移动端菜单切换
    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
        sidebar.classList.toggle('active', isSidebarOpen);
        overlay.classList.toggle('active', isSidebarOpen);
        if (isSearchOpen) {
            toggleSearch();
        }
    }

    // 移动端搜索切换
    function toggleSearch() {
        isSearchOpen = !isSearchOpen;
        searchContainer.classList.toggle('active', isSearchOpen);
        overlay.classList.toggle('active', isSearchOpen);
        if (isSearchOpen) {
            searchInput.focus();
            if (isSidebarOpen) {
                toggleSidebar();
            }
        }
    }

    // 关闭所有移动端面板
    function closeAllPanels() {
        if (isSidebarOpen) {
            toggleSidebar();
        }
        if (isSearchOpen) {
            toggleSearch();
        }
    }

    // 移动端事件监听
    menuToggle.addEventListener('click', toggleSidebar);
    searchToggle.addEventListener('click', toggleSearch);
    overlay.addEventListener('click', closeAllPanels);

    // 检查是否是移动设备
    function isMobile() {
        return window.innerWidth <= 768;
    }

    // 窗口大小改变时处理
    window.addEventListener('resize', () => {
        if (!isMobile()) {
            sidebar.classList.remove('active');
            searchContainer.classList.remove('active');
            overlay.classList.remove('active');
            isSidebarOpen = false;
            isSearchOpen = false;
        }
    });

    // 页面切换功能
    function showPage(pageId, skipSearchReset = false) {
        if (currentPageId === pageId && !skipSearchReset && !isInitialLoad) return;
        
        currentPageId = pageId;

        // 使用 RAF 确保动画流畅
        requestAnimationFrame(() => {
            pages.forEach(page => {
                const shouldBeActive = page.id === pageId;
                if (shouldBeActive !== page.classList.contains('active')) {
                    page.classList.toggle('active', shouldBeActive);
                }
            });

            // 初始加载完成后设置标志
            if (isInitialLoad) {
                isInitialLoad = false;
                document.body.classList.add('loaded');
            }
        });
        
        // 只有在非搜索状态下才重置搜索
        if (!skipSearchReset) {
            searchInput.value = '';
            resetSearch();
        }
    }

    // 搜索功能
    function performSearch(searchTerm) {
        // 确保搜索索引已初始化
        if (!searchIndex.initialized) {
            initSearchIndex();
        }
        
        searchTerm = searchTerm.toLowerCase().trim();

        // 如果搜索框为空，重置所有内容
        if (!searchTerm) {
            resetSearch();
            return;
        }

        if (!isSearchActive) {
            isSearchActive = true;
        }

        try {
            // 使用搜索索引进行搜索
            const searchResults = new Map();
            let hasResults = false;
            
            // 使用更高效的搜索算法
            const matchedItems = searchIndex.items.filter(item => {
                return item.searchText.includes(searchTerm);
            });
            
            // 按页面分组结果
            matchedItems.forEach(item => {
                if (!searchResults.has(item.pageId)) {
                    searchResults.set(item.pageId, []);
                }
                // 克隆元素以避免修改原始DOM
                searchResults.get(item.pageId).push(item.element.cloneNode(true));
                hasResults = true;
            });

            // 使用requestAnimationFrame批量更新DOM，减少重排重绘
            requestAnimationFrame(() => {
                try {
                    // 清空并隐藏所有搜索区域
                    searchSections.forEach(section => {
                        try {
                            const grid = section.querySelector('.sites-grid');
                            if (grid) {
                                grid.innerHTML = ''; // 使用innerHTML清空，比removeChild更高效
                            }
                            section.style.display = 'none';
                        } catch (sectionError) {
                            console.error('Error clearing search section:', sectionError);
                        }
                    });

                    // 使用DocumentFragment批量添加DOM元素，减少重排
                    searchResults.forEach((matches, pageId) => {
                        const section = searchResultsPage.querySelector(`[data-section="${pageId}"]`);
                        if (section) {
                            try {
                                const grid = section.querySelector('.sites-grid');
                                if (grid) {
                                    const fragment = document.createDocumentFragment();
                                    
                                    matches.forEach(card => {
                                        // 高亮匹配文本
                                        highlightSearchTerm(card, searchTerm);
                                        fragment.appendChild(card);
                                    });
                                    
                                    grid.appendChild(fragment);
                                    section.style.display = 'block';
                                }
                            } catch (gridError) {
                                console.error(`Error updating search results for ${pageId}:`, gridError);
                            }
                        } else {
                            console.warn(`Search section for page "${pageId}" not found`);
                        }
                    });

                    // 更新搜索结果页面状态
                    const subtitle = searchResultsPage.querySelector('.subtitle');
                    if (subtitle) {
                        subtitle.textContent = hasResults 
                            ? `在所有页面中找到 ${matchedItems.length} 个匹配项` 
                            : '未找到匹配的结果';
                    }

                    // 显示搜索结果页面
                    if (currentPageId !== 'search-results') {
                        currentPageId = 'search-results';
                        pages.forEach(page => {
                            page.classList.toggle('active', page.id === 'search-results');
                        });
                    }

                    // 更新搜索状态样式
                    searchBox.classList.toggle('has-results', hasResults);
                    searchBox.classList.toggle('no-results', !hasResults);
                } catch (uiError) {
                    console.error('Error updating search UI:', uiError);
                }
            });
        } catch (searchError) {
            console.error('Error performing search:', searchError);
        }
    }
    
    // 高亮搜索匹配文本
    function highlightSearchTerm(card, searchTerm) {
        if (!card || !searchTerm) return;
        
        try {
            const title = card.querySelector('h3');
            const description = card.querySelector('p');
            
            if (!title || !description) return;
            
            // 安全地高亮标题中的匹配文本
            if (title.textContent.toLowerCase().includes(searchTerm)) {
                const titleText = title.textContent;
                const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
                
                // 创建安全的DOM结构而不是直接使用innerHTML
                const titleFragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;
                
                // 使用正则表达式查找所有匹配项
                const titleRegex = new RegExp(regex);
                while ((match = titleRegex.exec(titleText)) !== null) {
                    // 添加匹配前的文本
                    if (match.index > lastIndex) {
                        titleFragment.appendChild(document.createTextNode(
                            titleText.substring(lastIndex, match.index)
                        ));
                    }
                    
                    // 添加高亮的匹配文本
                    const span = document.createElement('span');
                    span.className = 'highlight';
                    span.textContent = match[0];
                    titleFragment.appendChild(span);
                    
                    lastIndex = match.index + match[0].length;
                    
                    // 防止无限循环
                    if (titleRegex.lastIndex === 0) break;
                }
                
                // 添加剩余文本
                if (lastIndex < titleText.length) {
                    titleFragment.appendChild(document.createTextNode(
                        titleText.substring(lastIndex)
                    ));
                }
                
                // 清空原标题并添加新内容
                while (title.firstChild) {
                    title.removeChild(title.firstChild);
                }
                title.appendChild(titleFragment);
            }
            
            // 安全地高亮描述中的匹配文本
            if (description.textContent.toLowerCase().includes(searchTerm)) {
                const descText = description.textContent;
                const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
                
                // 创建安全的DOM结构而不是直接使用innerHTML
                const descFragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;
                
                // 使用正则表达式查找所有匹配项
                const descRegex = new RegExp(regex);
                while ((match = descRegex.exec(descText)) !== null) {
                    // 添加匹配前的文本
                    if (match.index > lastIndex) {
                        descFragment.appendChild(document.createTextNode(
                            descText.substring(lastIndex, match.index)
                        ));
                    }
                    
                    // 添加高亮的匹配文本
                    const span = document.createElement('span');
                    span.className = 'highlight';
                    span.textContent = match[0];
                    descFragment.appendChild(span);
                    
                    lastIndex = match.index + match[0].length;
                    
                    // 防止无限循环
                    if (descRegex.lastIndex === 0) break;
                }
                
                // 添加剩余文本
                if (lastIndex < descText.length) {
                    descFragment.appendChild(document.createTextNode(
                        descText.substring(lastIndex)
                    ));
                }
                
                // 清空原描述并添加新内容
                while (description.firstChild) {
                    description.removeChild(description.firstChild);
                }
                description.appendChild(descFragment);
            }
        } catch (error) {
            console.error('Error highlighting search term:', error);
        }
    }
    
    // 转义正则表达式特殊字符
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 重置搜索状态
    function resetSearch() {
        if (!isSearchActive) return;

        isSearchActive = false;

        try {
            requestAnimationFrame(() => {
                try {
                    // 清空搜索结果
                    searchSections.forEach(section => {
                        try {
                            const grid = section.querySelector('.sites-grid');
                            if (grid) {
                                while (grid.firstChild) {
                                    grid.removeChild(grid.firstChild);
                                }
                            }
                            section.style.display = 'none';
                        } catch (sectionError) {
                            console.error('Error clearing search section:', sectionError);
                        }
                    });

                    // 移除搜索状态样式
                    searchBox.classList.remove('has-results', 'no-results');

                    // 恢复到当前激活的页面
                    const currentActiveNav = document.querySelector('.nav-item.active');
                    if (currentActiveNav) {
                        const targetPageId = currentActiveNav.getAttribute('data-page');
                        
                        if (targetPageId && currentPageId !== targetPageId) {
                            currentPageId = targetPageId;
                            pages.forEach(page => {
                                page.classList.toggle('active', page.id === targetPageId);
                            });
                        }
                    } else {
                        // 如果没有激活的导航项，默认显示首页
                        currentPageId = 'home';
                        pages.forEach(page => {
                            page.classList.toggle('active', page.id === 'home');
                        });
                    }
                } catch (uiError) {
                    console.error('Error resetting search UI:', uiError);
                }
            });
        } catch (error) {
            console.error('Error in resetSearch:', error);
        }
    }

    // 搜索输入事件（使用防抖）
    const debounce = (fn, delay) => {
        let timer = null;
        return (...args) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                fn.apply(this, args);
                timer = null;
            }, delay);
        };
    };

    const debouncedSearch = debounce(performSearch, 300);

    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });

    // 搜索框事件处理
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            resetSearch();
        } else if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });

    // 阻止搜索框的回车默认行为
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });

    // 导航项点击效果
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.getAttribute('target') === '_blank') return;
            
            e.preventDefault();
            navItems.forEach(nav => {
                nav.classList.toggle('active', nav === item);
            });

            const pageId = item.getAttribute('data-page');
            if (pageId) {
                showPage(pageId);
            }
        });
    });

    // 初始化
    window.addEventListener('load', () => {
        // 延迟一帧执行初始化，确保样式已经应用
        requestAnimationFrame(() => {
            // 显示首页
            showPage('home');
            
            // 添加载入动画
            categories.forEach((category, index) => {
                setTimeout(() => {
                    category.style.opacity = '1';
                }, index * 100);
            });
            
            // 初始化搜索索引（使用requestIdleCallback或setTimeout延迟初始化，避免影响页面加载）
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => initSearchIndex());
            } else {
                setTimeout(initSearchIndex, 1000);
            }
        });
    });
}); 