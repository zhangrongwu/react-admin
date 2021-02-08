import React, {createElement, useRef} from 'react';
import {throttle} from 'lodash';
import classNames from 'classnames';
import {
    getDropGuidePosition,
    isDropAccept,
    getComponent,
} from '../../util';
import {getComponentDisplayName} from 'src/pages/drag-page/base-components';
import styles from './style.less';

export default function NodeRenderDraggable(props) {
    const {
        config,
        pageConfig,
        selectedNodeId,
        draggingNode,
        dragPageAction,
        activeSideKey, // 左侧激活面板
        nodeSelectType, // 节点选中方式
        iframeDocument,
        isPreview = true,
    } = props;

    const prevSideKeyRef = useRef(null);

    if (!config) return null;

    if (typeof config !== 'object' || Array.isArray(config)) return config;

    let {
        __config: {
            isContainer,
            draggable,
            componentId,
            componentType,
            componentDesc,
            withWrapper,
            wrapperStyle = {},
            actions = {},
            childrenDraggable,
        },
        componentName,
        children,
        props: componentProps = {},
    } = config;

    if (!componentName) return null;

    componentDesc = componentDesc || componentName;
    const componentDisplayName = getComponentDisplayName(config);

    let childrenEle = children?.length ? children.map(item => {

        return (
            <NodeRenderDraggable
                config={item}
                pageConfig={pageConfig}
                draggingNode={draggingNode}
                selectedNodeId={selectedNodeId}
                dragPageAction={dragPageAction}
                activeSideKey={activeSideKey}
                isPreview={isPreview || !childrenDraggable}
                nodeSelectType={nodeSelectType}
                iframeDocument={iframeDocument}
            />
        );
    }) : undefined;


    const component = getComponent(componentName, componentType);


    const componentActions = Object.entries(actions)
        .reduce((prev, curr) => {
            const [key, value] = curr;
            prev[key] = (...args) => value(...args)({
                pageConfig,
                dragPageAction,
                node: config,
            });
            return prev;
        }, {});


    const propsActions = {};
    ['onClick'].forEach(key => {
        const value = componentProps[key];
        if (typeof value === 'string') {
            // eslint-disable-next-line
            propsActions[key] = eval(value);
        }
    });

    const commonProps = {
        children: childrenEle,
        ...componentActions,
    };

    if (isPreview) {
        return createElement(component, {
            ...commonProps,
            ...componentProps,
            ...propsActions,
        });
    }


    const dragClassName = classNames({
        [styles.draggableElement]: true,
        [styles.selected]: selectedNodeId === componentId,
        [styles.dragging]: draggingNode?.__config?.componentId === componentId,
        [styles.unDraggable]: !draggable,

    });

    const onDragStart = function(e) {
        e.stopPropagation();

        dragPageAction.setDraggingNode(config);
        prevSideKeyRef.current = activeSideKey;

        dragPageAction.setActiveSideKey('componentTree');

        // 拖拽携带的数据
        e.dataTransfer.setData('sourceComponentId', componentId);
    };

    function onDragEnter(e) {
        // 不要做任何导致当前页面render的操作，否则元素多了会很卡
        // e.stopPropagation();
        // e.preventDefault();

        // const targetElement = getDroppableEle(e.target);

        // if (!targetElement) return;

        // const targetId = targetElement.getAttribute('data-componentId');
        // 不要设置，否则会很卡
        // dragPageAction.setSelectedNodeId(targetId);
    }

    function onDragLeave() {
        dragPageAction.setDragOverInfo(null);
    }

    function onDragEnd() {
        dragPageAction.setDragOverInfo(null);
        dragPageAction.setDraggingNode(null);
        if (prevSideKeyRef.current) {
            dragPageAction.setActiveSideKey(prevSideKeyRef.current);
            prevSideKeyRef.current = null;
        }
    }

    const THROTTLE_TIME = 50; // 如果卡顿，可以调整大一些
    const throttleOver = throttle((e) => {
        const targetElement = getDroppableEle(e.target);

        if (!targetElement) return;

        const targetComponentId = targetElement.getAttribute('data-componentId');

        // 放在自身上
        if (draggingNode?.__config?.componentId === targetComponentId) return;

        const {pageX, pageY, clientX, clientY} = e;

        const position = getDropPosition({
            pageX,
            pageY,
            clientX,
            clientY,
            targetElement,
            frameDocument: iframeDocument,
        });

        if (!position) return;

        const accept = isDropAccept({
            draggingNode,
            pageConfig,
            targetComponentId,
            ...position,
        });

        if (!accept) {
            // e.dataTransfer.dropEffect = 'move';
            // e.dataTransfer.effectAllowed = 'copy';
            return;
        }

        dragPageAction.setDragOverInfo({
            targetElement,
            pageX,
            pageY,
            clientX,
            clientY,
            guidePosition: position.guidePosition,
        });
    }, THROTTLE_TIME);

    // 不要做任何导致当前页面render的操作，否则元素多了会很卡
    function onDragOver(e) {
        e.stopPropagation();
        e.preventDefault();

        let cursor = 'move';

        const isCopy = draggingNode?.__config?.__fromStore;
        if (isCopy) cursor = 'copy';

        const isPropsToSet = draggingNode?.propsToSet;
        if (isPropsToSet) cursor = 'link';

        e.dataTransfer.dropEffect = cursor;

        throttleOver(e);
    }

    function onDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        const end = () => {
            onDragLeave(e);
            onDragEnd();
        };

        const targetElement = getDroppableEle(e.target);
        if (!targetElement) return end();

        const targetComponentId = targetElement.getAttribute('data-componentId');

        const propsToSet = e.dataTransfer.getData('propsToSet');

        if (propsToSet) {
            const newProps = JSON.parse(propsToSet);

            dragPageAction.setNewProps({componentId, newProps});

            return end();
        }


        const sourceComponentId = e.dataTransfer.getData('sourceComponentId');
        let componentConfig = e.dataTransfer.getData('componentConfig');

        if (targetComponentId === sourceComponentId) return end();

        const {pageX, pageY, clientX, clientY} = e;

        const position = getDropPosition({
            pageX,
            pageY,
            clientX,
            clientY,
            targetElement,
            frameDocument: iframeDocument,
        });

        if (!position) return end();

        const accept = isDropAccept({
            draggingNode,
            pageConfig,
            targetComponentId,
            ...position,
        });

        if (!accept) return end();

        if (sourceComponentId) {
            dragPageAction.moveNode({
                sourceId: sourceComponentId,
                targetId: targetComponentId,
                ...position,
            });
            dragPageAction.setSelectedNodeId(sourceComponentId);
        }

        if (componentConfig) {
            componentConfig = JSON.parse(componentConfig);
            dragPageAction.addNode({
                targetId: targetComponentId,
                node: componentConfig,
                ...position,
            });
            dragPageAction.setSelectedNodeId(componentConfig.__config?.componentId);
        }
        end();
    }

    const dragProps = {
        draggable,
        onDragStart,
        onDragEnter,
        onDragOver,
        onDragLeave,
        onDrop,
        onDragEnd,
        'data-componentDesc': componentDesc,
        'data-componentDisplayName': componentDisplayName,
        'data-componentId': componentId,
        'data-isContainer': isContainer,
    };

    const onNodeClick = (e) => {
        e.stopPropagation && e.stopPropagation();
        e.preventDefault && e.preventDefault();

        if (nodeSelectType === 'meta') {
            if ((e.metaKey || e.ctrlKey)) {
                // 单纯选中节点，不进行其他操作
                dragPageAction.setSelectedNodeId(componentId);
            } else {
                propsActions.onClick && propsActions.onClick(e);
            }
        }

        // 单击模式
        if (nodeSelectType === 'click') {
            propsActions.onClick && propsActions.onClick(e);
            dragPageAction.setSelectedNodeId(componentId);
        }
    };

    if (withWrapper) {
        let {style = {}} = componentProps;
        const wStyle = {...wrapperStyle};

        style = {...style}; // 浅拷贝一份 有可能会修改

        // 同步到 wrapper 的样式
        const syncTopWStyle = [
            'display',
            'width',
            'height',
        ];

        // 移动到 wrapper上的样式
        const removeTopWStyle = [
            'marginTop',
            'marginRight',
            'marginBottom',
            'marginLeft',
        ];

        syncTopWStyle.forEach(key => {
            if (!(key in style)) return;

            wStyle[key] = style[key];
        });

        removeTopWStyle.forEach(key => {
            if (!(key in style)) return;

            wStyle[key] = style[key];
            style[key] = undefined;
        });

        return createElement('div', {
            ...dragProps,
            className: dragClassName + ' dragWrapper',
            style: wStyle,
            children: [
                createElement(component, {
                    ...commonProps,
                    ...componentProps,
                    ...propsActions,
                    onClick: onNodeClick,
                    style,
                }),
            ],
        });
    }

    return createElement(component, {
        ...commonProps,
        ...componentProps,
        ...propsActions,
        ...dragProps,
        className: [dragClassName, componentProps.className].join(' '),
        onClick: onNodeClick,
    });
}

// 可投放元素
function getDroppableEle(target) {
    if (!target) return target;

    if (typeof target.getAttribute !== 'function') return null;

    // 当前是容器
    let draggable = target.getAttribute('data-isContainer') === 'true';

    // 父级是容器
    if (!draggable && target.parentNode?.getAttribute) {
        draggable =
            target.parentNode.getAttribute('data-isContainer') === 'true'
            && target.getAttribute('data-componentId');
    }

    if (draggable) return target;

    return getDroppableEle(target.parentNode);
}

// 获取组件投放位置
function getDropPosition(options) {
    const guidePosition = getDropGuidePosition(options);

    const {position} = guidePosition;

    if (!position) return;

    let {
        isTop,
        isLeft,
        isBottom,
        isRight,
        isCenter: isChildren,
    } = position;

    if (isLeft || isRight) {
        isTop = false;
        isBottom = false;
        isChildren = false;
    }

    const isBefore = isTop || isLeft;
    const isAfter = isBottom || isRight;

    return {
        ...position,
        isBefore,
        isAfter,
        isChildren,
        guidePosition,
    };
}
