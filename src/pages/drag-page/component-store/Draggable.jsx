import React from 'react';
import config from 'src/commons/config-hoc';
import {v4 as uuid} from 'uuid';
import './DraggableComponent.less';
import {cloneDeep} from 'lodash';

export default config({
    connect: true,
})(function DraggableComponent(props) {
    const {
        data,
        action: {
            dragPage: dragPageAction,
        },
        children,
        style = {},
        ...others
    } = props;

    function handleDragStart(e) {
        e.stopPropagation();

        // 打开组件组
        setTimeout(() => {
            dragPageAction.setActiveSideKey('componentTree');
        });

        const config = cloneDeep(data.config);

        // 设置 componentId
        const loop = (node) => {
            if (!node.__config) node.__config = {};

            node.__config.componentId = uuid();

            if (node.children?.length) {
                node.children.forEach(n => loop(n));
            }
        };

        loop(config);

        e.dataTransfer.setData('componentConfig', JSON.stringify(config));
        dragPageAction.setDraggingNode(config);
    }

    function handleDragEnd() {
        // 从新打开组件库
        dragPageAction.setActiveSideKey('componentStore');
    }

    const draggable = !!data;

    if (!draggable) return children;

    return (
        <div
            {...others}
            style={{cursor: 'move', ...style}}
            draggable={draggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {children}
        </div>
    );
});
