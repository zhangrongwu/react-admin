import React from 'react';
import {AppstoreOutlined} from '@ant-design/icons';
import NodeRender from 'src/pages/drag-page/iframe-render/node-render/NodeRender';

const result = {};
const req = require.context('./', true, /\.js$/);

req.keys().forEach(key => {
    if ([
        './options.js',
        './index.js',
    ].includes(key)) return;

    const model = req(key);
    const keys = key.split('/');
    let fileName = keys.pop().replace('.js', '');

    result[fileName] = model.default;
});

const defaultConfig = {
    // editableContents: [ // 可编辑内容
    //     {
    //         selector: '.ant-modal-title', // 基于当前元素的选择器，缺省标识当前节点
    //         propsField: 'title', // 要修改的props属性
    //
    //          onInput: event => options => { // 输入事件
    //              const {node, pageConfig, dragPageAction} = options;
    //              const value = event.target.innerText;
    //
    //              if (!node.props) node.props = {};
    //              node.props.title = value;
    //
    //          },
    //          onBlur: event => options => { // 失去焦点事件
    //              const {node, pageConfig, dragPageAction} = options;
    //              const value = event.target.innerText;
    //
    //              if (!node.props) node.props = {};
    //              node.props.title = value;
    //
    //          },
    //
    //
    //     },
    // ],
    icon: <AppstoreOutlined/>, // 组件图标
    // isFormElement: undefined, // 是否是表单组件，如果是，可以放入 Form.Item中
    // renderComponentName: '', // 指定渲染使用组件，比如 PageContent 并不存在，可以指定使用div渲染
    // componentId: undefined, // 渲染时组件id
    // componentDesc: undefined, // 组件描述
    // componentType: undefined, // 组件类型，详见 getComponent方法，默认 drag-page/components -> antd -> html
    // componentDisplayName: '', // 组件展示名称，默认 componentName，string 字符串 || ReactNode 节点 || ({node, pageConfig}) => name 函数返回值
    // renderAsDisplayName: '', // 是否渲染组件，作为componentDisplayName
    draggable: true, // 组件是否可拖拽 默认 true
    isContainer: true, // 组件是否是容器，默认true，如果是容器，则可托放入子节点
    withWrapper: false, // 是否需要拖拽包裹元素，默认 false，有些组件拖拽无效，需要包裹一下
    // wrapperStyle: undefined, // {display: 'inline-block'}, // 拖拽包裹元素样式，一般用来设置 display width height 等

    // propsToSet: '', // 连接时，要设置的属性

    // dropAccept: undefined, // ['Text'] || function, // 可拖入组件，默认 任意组件都可放入
    // 如果某个组件必须存在子元素，可以添加 withHolder: true, 提示用户必须拖入子元素，比如 Form.Item，但是div不要设置true，有些情况div不需要子元素
    withHolder: false, // 当没有子组件的时候，是否显示holder 默认 false ，true && isContainer 显示
    // holderProps: {}, //

    childrenDraggable: true, // 子节点是否可拖拽，
    // actions: { // 事件 event:组件事件原始数据 options: 自定义数据
    //     onSearch: event => options => {
    //
    //         const {
    //             pageConfig, // 页面整体配置
    //             dragPageAction, // 页面action
    //             node, // 当前组件配置
    //         } = options;
    //         if (!node.props) node.props = {};
    //
    //         node.props.options = [
    //             {event: `${event}@qq.com`},
    //             {event: `${event}@163.com`},
    //             {event: `${event}@qiye.com`},
    //         ];
    //
    //         dragPageAction.render(); // props改变了，重新出发页面渲染
    //     },
    // },
    // hooks: {
    // beforeMove // 返回false， 不允许移动
    // afterMove

    // beforeAdd, // 返回false， 不添加
    // afterAdd,

    // beforeDelete,  // 返回false，不删除
    // afterDelete,

    // beforeAddChildren // 返回false，不允许添加
    // afterAddChildren

    // beforeDeleteChildren // 返回false，不允许删除
    // afterDeleteChildren
    // },
    // // 组件属性配置信息
    // fields: [
    //     {
    //         label: '', // 名称
    //         field: '', // 字段名
    //         type: '', // 编辑类型
    //         options: [], // 下拉等选项数据
    //         defaultValue: '', // 默认值
    //         version: '', // 版本
    //         desc: '', // 描述
    //         category: '', // 分类成一组的名称
    //         categoryOrder: 2,// 分类排序位置
    //         span: 12, //  Col 属性，用于排版
    //         withLabel: true, // options选项，是否有label列，默认true
    //     },
    // ],
};

export function showFieldByAppend(values, appendField) {
    if (!appendField) return true;

    let isShow;
    if (typeof appendField === 'string') {
        isShow = !!values[appendField];
    }

    if (typeof appendField === 'object') {
        isShow = Object.entries(appendField).some(([k, v]) => {
            return values[k] === v;
        });
    }

    return isShow;
}

// 删除默认属性
export function deleteDefaultProps(component) {
    const loop = node => {
        let {componentName, props, children} = node;

        if (!props) props = {};
        const propsConfig = getComponentConfig(componentName);
        if (propsConfig) {
            const {fields = []} = propsConfig;
            Object.entries(props)
                .forEach(([key, value]) => {
                    // 值为 空字符串
                    if (value === '') Reflect.deleteProperty(props, key);

                    // 值为 undefined
                    if (value === undefined) Reflect.deleteProperty(props, key);

                    const fieldOptions = fields.find(item => item.field === key);

                    // 与默认值相同
                    if (fieldOptions && fieldOptions.defaultValue === value) {
                        Reflect.deleteProperty(props, key);
                    }

                    // 依赖父级不存在
                    if (fieldOptions && fieldOptions.appendField) {
                        const {appendField} = fieldOptions;

                        const isShow = showFieldByAppend(props, appendField);

                        if (!isShow) {
                            Reflect.deleteProperty(props, key);
                        }
                    }
                });
        }

        if (children?.length) {
            children.forEach(item => loop(item));
        }
    };

    loop(component);
}

// 获取组件配置
export function getComponentConfig(componentName) {
    const config = result[componentName] || {};

    Object.entries(defaultConfig)
        .forEach(([key, value]) => {
            if (!(key in config)) {
                config[key] = value;
            }
        });

    // 冻结，不允许编辑
    Object.freeze(config);

    return config;
}

// 获取组件展示名称
export function getComponentDisplayName(node, render) {
    if (!node) return '';

    const {componentName} = node;
    const config = getComponentConfig(componentName);
    const {componentDisplayName, renderAsDisplayName} = config;

    if (render && renderAsDisplayName) {
        return (
            <div style={{display: 'inline-block', maxWidth: 200}}>
                <NodeRender config={node}/>
            </div>
        );
    }

    let name = componentDisplayName || componentName;

    if (typeof name === 'function') name = name({node});

    return name;
}

export default result;

